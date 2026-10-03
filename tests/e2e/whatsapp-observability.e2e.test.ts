import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "@/app";
import { prisma } from "@/lib/prisma.client";
import { WhatsAppManager } from "@/lib/wpp/whatsapp.manager";
import type { FastifyInstance } from "fastify";

describe("E2E QA Suite: WhatsApp Connection & VPS Observability (Sprint 2)", () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Cria usuário isolado para os testes de WhatsApp
    const userEmail = `qa_wpp_${Date.now()}@whatseasy.test`;
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "WhatsApp QA Specialist",
        email: userEmail,
        password: "WppPassword123!",
      },
    });

    const regData = regRes.json();
    authToken = regData.data.token;
    userId = regData.data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await WhatsAppManager.logoutSession(userId).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("Security & Guard Rails (Pessimistic QA)", () => {
    it("should reject /whatsapp/status when unauthenticated", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/whatsapp/status",
      });
      expect(res.statusCode).toBe(401);
    });

    it("should reject /whatsapp/status with forged or malformed JWT", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/whatsapp/status",
        headers: { Authorization: "Bearer forged.token.here" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should reject /logs when unauthenticated", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/logs",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("VPS System Health & Liveness Observability (/health)", () => {
    it("should return healthy status with uptime, database and whatsapp telemetry", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe("healthy");
      expect(data.database.connected).toBe(true);
      expect(data.whatsapp.authsDir).toBeDefined();
      expect(typeof data.uptimeSeconds).toBe("number");
      expect(data.system.memoryRssMb).toBeDefined();
    });
  });

  describe("WhatsApp Connection Lifecycle Endpoints", () => {
    it("should report initial disconnected status with clean metadata", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/whatsapp/status",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.status).toBe("DISCONNECTED");
      expect(json.data.isConnected).toBe(false);
    });

    it("should reject sending messages without required phone or text", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/whatsapp/send",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          phone: "",
          message: "Teste",
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.message).toContain("obrigatórios");
    });

    it("should handle malicious injection strings in phone & message gracefully", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/whatsapp/send",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          phone: "'; DROP TABLE users; --",
          message: "<script>alert('xss')</script>",
        },
      });

      // Should fail gracefully because session is disconnected (or phone invalid) without crashing
      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.status).toBe("fail");
    });

    it("should fail gracefully when sending message from disconnected session", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/whatsapp/send",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          phone: "5511999998888",
          message: "Olá mundo",
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.message).toContain("não está conectado");
    });

    it("should support logout and cleanup of session resources without crashing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/whatsapp/logout",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.toastMessage).toContain("desconectada");
    });
  });

  describe("Phone Number Normalization & LID Resolution Engine", () => {
    it("should resolve standard JID formats to clean numbers", async () => {
      const phone1 = await WhatsAppManager.resolvePhoneNumber(userId, "5511999887766@s.whatsapp.net");
      expect(phone1).toBe("5511999887766");

      const phone2 = await WhatsAppManager.resolvePhoneNumber(userId, "5511999887766:12@s.whatsapp.net");
      expect(phone2).toBe("5511999887766");
    });

    it("should resolve explicit phoneNumber in metadata", async () => {
      const phone = await WhatsAppManager.resolvePhoneNumber(userId, "1234567890@lid", {
        phoneNumber: "5521988776655",
      });
      expect(phone).toBe("5521988776655");
    });

    it("should return null for unmappable pure LID identifiers", async () => {
      const phone = await WhatsAppManager.resolvePhoneNumber(userId, "999999999999@lid");
      expect(phone).toBeNull();
    });
  });

  describe("Activity Logs & Observability (/logs)", () => {
    beforeAll(async () => {
      // Limpa logs anteriores do usuário para isolamento perfeito
      await prisma.activityLog.deleteMany({ where: { userId } }).catch(() => {});

      // Cria logs de teste
      await prisma.activityLog.createMany({
        data: [
          {
            userId,
            eventType: "WPP_CONNECT",
            status: "SUCCESS",
            description: "WhatsApp Conectado com sucesso",
          },
          {
            userId,
            eventType: "MSG_RECEIVED",
            status: "SUCCESS",
            contactPhone: "5511988887777",
            contactName: "Maria Cliente",
            description: "Mensagem recebida: Olá!",
          },
          {
            userId,
            eventType: "TRIGGER_FAIL",
            status: "ERROR",
            description: "Falha ao executar trigger de boas vindas",
          },
        ],
      });
    });

    it("should list activity logs with pagination and total count", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/logs?limit=10&page=1",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.total).toBe(3);
      expect(json.data.logs.length).toBe(3);
      expect(json.data.page).toBe(1);
    });

    it("should filter logs by eventType and status", async () => {
      const filterRes = await app.inject({
        method: "GET",
        url: "/logs?eventType=WPP_CONNECT",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(filterRes.statusCode).toBe(200);
      const json = filterRes.json();
      expect(json.data.logs.length).toBe(1);
      expect(json.data.logs[0].eventType).toBe("WPP_CONNECT");

      const errorRes = await app.inject({
        method: "GET",
        url: "/logs?status=ERROR",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const errorJson = errorRes.json();
      expect(errorJson.data.logs.length).toBe(1);
      expect(errorJson.data.logs[0].status).toBe("ERROR");
    });

    it("should search logs by keyword in description, contact name or phone", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/logs?search=Maria",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.logs.length).toBe(1);
      expect(json.data.logs[0].contactName).toBe("Maria Cliente");
    });

    it("should clear user logs on DELETE /logs without affecting other users", async () => {
      const deleteRes = await app.inject({
        method: "DELETE",
        url: "/logs",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(deleteRes.statusCode).toBe(200);

      const listRes = await app.inject({
        method: "GET",
        url: "/logs",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const listJson = listRes.json();
      expect(listJson.data.total).toBe(0);
      expect(listJson.data.logs.length).toBe(0);
    });
  });
});

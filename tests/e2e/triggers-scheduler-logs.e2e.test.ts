import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "@/app";
import { prisma } from "@/lib/prisma.client";
import { LoggerService } from "@/lib/services/logger.service";
import type { FastifyInstance } from "fastify";

describe("E2E QA Suite: Triggers, Scheduler & Operational Logs", () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let testTriggerId: number;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Cria usuário isolado
    const userEmail = `qa_triggers_${Date.now()}@whatseasy.test`;
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Trigger QA Analyst",
        email: userEmail,
        password: "TriggerPass123!",
      },
    });

    const regData = regRes.json();
    authToken = regData.data.token;
    userId = regData.data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.temporalCondition.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.triggerLog.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.responseTriggerRelation.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.trigger.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("Outbound Triggers CRUD", () => {
    it("should create a scheduled trigger with temporal condition", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/triggers",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Bom Dia Clientes",
          type: "RECURRING_DAILY",
          targetTime: "09:00",
          responses: [
            { content: "Bom dia! Confira nossas novidades de hoje." },
          ],
        },
      });

      expect([200, 201]).toContain(res.statusCode);
      const json = res.json();
      expect(json.data.name).toBe("Bom Dia Clientes");
      testTriggerId = json.data.id;
    });

    it("should toggle trigger active state", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/triggers/${testTriggerId}/toggle`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.active).toBe(false);
    });
  });

  describe("Operational Logs & Audit Trail", () => {
    it("should register activity logs and query them with pagination and filters", async () => {
      // Registra alguns logs
      await LoggerService.log({
        userId,
        eventType: "WPP_CONNECT",
        description: "WhatsApp conectado via QR Code com sucesso.",
        status: "SUCCESS",
      });

      await LoggerService.log({
        userId,
        eventType: "MSG_SENT",
        description: "Mensagem enviada para 5511999998888.",
        contactPhone: "5511999998888",
        status: "SUCCESS",
      });

      await LoggerService.log({
        userId,
        eventType: "ERROR",
        description: "Falha transitória na conexão.",
        status: "ERROR",
      });

      const res = await app.inject({
        method: "GET",
        url: "/logs?limit=10",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.logs.length).toBeGreaterThanOrEqual(3);
      expect(json.data.total).toBeGreaterThanOrEqual(3);
    });

    it("should filter logs by eventType", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/logs?eventType=ERROR",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.logs.every((l: any) => l.eventType === "ERROR")).toBe(true);
    });
  });
});

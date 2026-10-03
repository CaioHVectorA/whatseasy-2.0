import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "@/app";
import { prisma } from "@/lib/prisma.client";
import type { FastifyInstance } from "fastify";

describe("E2E QA Suite: Playground Interactive Simulator", () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Cria usuário isolado para os testes do Playground
    const userEmail = `qa_playground_${Date.now()}@whatseasy.test`;
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Playground QA Tester",
        email: userEmail,
        password: "PlaygroundPass123!",
      },
    });

    const regData = regRes.json();
    authToken = regData.data.token;
    userId = regData.data.user.id;

    // Configura um reativo para testar no Playground
    await app.inject({
      method: "POST",
      url: "/reactives",
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        name: "Saudação Playground",
        active: true,
        textTriggers: ["oi", "ola", "comecar"],
        responses: [
          { content: "Bem-vindo ao atendimento automatizado, {primeiro_nome}!" },
        ],
      },
    });
  });

  afterAll(async () => {
    if (userId) {
      await prisma.responseTriggerRelation.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.textTrigger.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.trigger.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("Playground Lifecycle & Real-Time Simulation", () => {
    it("should customize simulation lead contact", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/playground/contact",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Roberto Silva",
          phone: "5511988887777",
          customFields: { segmento: "E-commerce" },
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.contact.name).toBe("Roberto Silva");
      expect(json.data.contact.phone).toBe("5511988887777");
    });

    it("should simulate a lead message and trigger bot automated response instantly", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/playground/simulate",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          text: "Olá, gostaria de comecar",
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();

      const messages = json.data.messages;
      expect(messages.length).toBe(2);
      expect(messages[0].sender).toBe("contact");
      expect(messages[0].text).toBe("Olá, gostaria de comecar");

      expect(messages[1].sender).toBe("bot");
      expect(messages[1].text).toContain("Bem-vindo ao atendimento automatizado, Roberto!");
    });

    it("should retrieve current simulation state", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/playground/session",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.messages.length).toBe(2);
      expect(json.data.contact.name).toBe("Roberto Silva");
    });

    it("should reset the simulation session cleanly", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/playground/reset",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.messages.length).toBe(0);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "@/app";
import { prisma } from "@/lib/prisma.client";
import { ActionEngine } from "@/lib/engine/action-engine";
import { PlaygroundSimulatorAdapter } from "@/lib/engine/playground.adapter";
import { ConversationStateManager } from "@/lib/engine/conversation-state";
import type { FastifyInstance } from "fastify";

describe("E2E QA Suite: Reactive Automation & Flow Execution Engine", () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let testContact: any;
  let targetClusterId: number;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Cria usuário isolado para os testes de Automação
    const userEmail = `qa_reactive_${Date.now()}@whatseasy.test`;
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Automation QA Engineer",
        email: userEmail,
        password: "ReactivePassword123!",
      },
    });

    const regData = regRes.json();
    authToken = regData.data.token;
    userId = regData.data.user.id;

    // Cria cluster de destino para o menu
    const cluster = await prisma.contactCluster.create({
      data: {
        name: "Interessados em Planos",
        userId,
      },
    });
    targetClusterId = cluster.id;

    // Cria contato de teste no banco
    testContact = await prisma.contacts.create({
      data: {
        name: "Carlos Ferreira",
        phone: "5511977665544",
        userId,
        customFields: JSON.stringify({ empresa: "Tech Inovação", plano_interesse: "Nenhum" }),
      },
    });
  });

  afterAll(async () => {
    if (userId) {
      await prisma.responseTriggerRelation.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.textTrigger.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.triggerLog.deleteMany({ where: { Trigger: { userId } } }).catch(() => {});
      await prisma.trigger.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.contacts.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.contactCluster.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("Reactive CRUD & Trigger Creation", () => {
    it("should create a reactive with CONTAINS text triggers and variable interpolation response", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/reactives",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "FAQ Preço e Planos",
          active: true,
          textTriggers: ["preço", "quanto custa", "valor"],
          responses: [
            { content: "Olá {primeiro_nome}! Da empresa {empresa}? Nossos planos iniciam em R$ 99/mês." },
          ],
        },
      });

      expect([200, 201]).toContain(res.statusCode);
      const json = res.json();
      expect(json.data.name).toBe("FAQ Preço e Planos");
    });

    it("should list all reactives configured for the user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/reactives",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].textTriggers.length).toBe(3);
    });
  });

  describe("End-to-End ActionEngine Execution via Mock Channel", () => {
    it("should trigger reactive and interpolate dynamic contact variables correctly", async () => {
      const simulatedChannel = new PlaygroundSimulatorAdapter(userId);

      await ActionEngine.handleIncomingMessage({
        userId,
        contact: testContact,
        messageText: "Gostaria de saber o preço por favor",
        channel: simulatedChannel,
      });

      const session = PlaygroundSimulatorAdapter.getSession(userId);
      const outbound = session.messages.filter((m) => m.sender === "bot");
      expect(outbound.length).toBe(1);
      expect(outbound[0].text).toContain("Olá Carlos!");
      expect(outbound[0].text).toContain("Da empresa Tech Inovação?");
      expect(outbound[0].text).toContain("R$ 99/mês");
    });

    it("should reject invalid responses when awaiting menu input and resend the menu cleanly", async () => {
      PlaygroundSimulatorAdapter.reset(userId);
      const simulatedChannel = new PlaygroundSimulatorAdapter(userId);

      // Configura estado de sessão esperando escolha de menu
      ConversationStateManager.setSession(userId, testContact.phone, {
        waitingInput: true,
        validationType: "OPTION",
        targetFieldKey: "plano_interesse",
        validOptions: [
          { key: "1", label: "Plano Starter", targetClusterId },
          { key: "2", label: "Plano Enterprise" },
        ],
        menuRawText: "Escolha seu plano:\n1️⃣ Plano Starter\n2️⃣ Plano Enterprise",
        variables: {},
      });

      // Usuário manda resposta totalmente inválida
      await ActionEngine.handleIncomingMessage({
        userId,
        contact: testContact,
        messageText: "abobora frita",
        channel: simulatedChannel,
      });

      const session = PlaygroundSimulatorAdapter.getSession(userId);
      const outbound = session.messages.filter((m) => m.sender === "bot");
      expect(outbound.length).toBe(2);
      expect(outbound[0].text).toContain("Opção inválida");
      expect(outbound[1].text).toContain("Escolha seu plano");

      // Sessão deve continuar ativa aguardando
      const activeState = ConversationStateManager.getSession(userId, testContact.phone);
      expect(activeState?.waitingInput).toBe(true);
    });

    it("should process valid menu option by number, save variable to contact and add to target cluster", async () => {
      PlaygroundSimulatorAdapter.reset(userId);
      const simulatedChannel = new PlaygroundSimulatorAdapter(userId);

      // Usuário envia "1"
      await ActionEngine.handleIncomingMessage({
        userId,
        contact: testContact,
        messageText: "1",
        channel: simulatedChannel,
      });

      // Sessão deve ser finalizada
      const activeState = ConversationStateManager.getSession(userId, testContact.phone);
      expect(activeState).toBeFalsy();

      // Contato deve ter sido atualizado no banco de dados com a variável e o cluster
      const updatedContact = await prisma.contacts.findUnique({
        where: { id: testContact.id },
      });

      expect(updatedContact?.clusterId).toBe(targetClusterId);
      const customFields = JSON.parse(updatedContact?.customFields || "{}");
      expect(customFields.plano_interesse).toBe("Plano Starter");
    });
  });

  describe("Canvas Flow Builder CRUD & Architecture (Sprint 3)", () => {
    let createdFlowId: number;

    it("should reject creating canvas flow with empty name", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/flows",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "",
          nodes: [],
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.message).toContain("nome do fluxo");
    });

    it("should create full visual canvas flow with trigger, message, delay and action nodes", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/flows",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Fluxo Onboarding VIP",
          active: true,
          triggerKeywords: ["vip", "começar vip"],
          triggerType: "CONTAINS",
          nodes: [
            {
              id: "node_1",
              type: "trigger",
              position: { x: 50, y: 100 },
              data: { keywords: "vip, começar vip" },
            },
            {
              id: "node_2",
              type: "message",
              position: { x: 300, y: 100 },
              data: { content: "Bem-vindo ao canal VIP {primeiro_nome}!" },
            },
            {
              id: "node_3",
              type: "delay",
              position: { x: 550, y: 100 },
              data: { seconds: 1 },
            },
            {
              id: "node_4",
              type: "action",
              position: { x: 800, y: 100 },
              data: {
                actionType: "ADD_CLUSTER",
                clusterId: targetClusterId,
              },
            },
          ],
          edges: [
            { id: "e1-2", source: "node_1", target: "node_2" },
            { id: "e2-3", source: "node_2", target: "node_3" },
            { id: "e3-4", source: "node_3", target: "node_4" },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.name).toBe("Fluxo Onboarding VIP");
      createdFlowId = json.data.id;
    });

    it("should retrieve canvas flow details by ID with parsed nodes and edges", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/flows/${createdFlowId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.id).toBe(createdFlowId);
      expect(json.data.nodes.length).toBe(4);
      expect(json.data.edges.length).toBe(3);
    });

    it("should execute Canvas Flow end-to-end when triggered by keyword", async () => {
      PlaygroundSimulatorAdapter.reset(userId);
      const simulatedChannel = new PlaygroundSimulatorAdapter(userId);

      await ActionEngine.handleIncomingMessage({
        userId,
        contact: testContact,
        messageText: "Quero entrar no grupo vip agora!",
        channel: simulatedChannel,
      });

      const session = PlaygroundSimulatorAdapter.getSession(userId);
      const outbound = session.messages.filter((m) => m.sender === "bot");
      expect(outbound.length).toBeGreaterThanOrEqual(1);
      expect(outbound[0].text).toContain("Bem-vindo ao canal VIP Carlos!");
    });

    it("should update canvas flow name, nodes and active status", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/flows/${createdFlowId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Fluxo Onboarding VIP (Renomeado)",
          active: false,
          nodes: [],
          edges: [],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.name).toBe("Fluxo Onboarding VIP (Renomeado)");
      expect(json.data.active).toBe(false);
    });

    it("should delete canvas flow cleanly", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/flows/${createdFlowId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);

      const getRes = await app.inject({
        method: "GET",
        url: `/flows/${createdFlowId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(getRes.statusCode).toBe(404);
    });
  });
});


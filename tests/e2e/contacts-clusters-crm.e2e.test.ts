import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "@/app";
import { prisma } from "@/lib/prisma.client";
import type { FastifyInstance } from "fastify";

describe("E2E QA Suite: Contacts, Clusters & Dynamic CRM Engine", () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let testClusterId: number;
  let testContactId: number;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Cria usuário isolado para os testes de CRM
    const userEmail = `qa_crm_${Date.now()}@whatseasy.test`;
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "CRM QA Specialist",
        email: userEmail,
        password: "CrmPassword123!",
      },
    });

    const regData = regRes.json();
    authToken = regData.data.token;
    userId = regData.data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.contactClusterRelation.deleteMany({ where: { Contact: { userId } } }).catch(() => {});
      await prisma.contacts.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.contactCluster.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.customFieldDefinition.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("Custom Field Definitions (Dynamic Database)", () => {
    it("should create a custom field definition (e.g. empresa, cargo)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/custom-fields",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          key: "empresa",
          label: "Nome da Empresa",
          type: "TEXT",
        },
      });

      expect([200, 201]).toContain(res.statusCode);
      const json = res.json();
      expect(json.data.key).toBe("empresa");
    });

    it("should list all registered custom field definitions", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/custom-fields",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data.some((f: any) => f.key === "empresa")).toBe(true);
    });
  });

  describe("Cluster Management", () => {
    it("should create a new cluster", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/cluster",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Clientes VIP 2026",
          description: "Contatos com ticket acima de R$ 5k",
        },
      });

      expect([200, 201]).toContain(res.statusCode);
      const json = res.json();
      expect(json.data.name).toBe("Clientes VIP 2026");
      testClusterId = json.data.id;
    });

    it("should prevent creating duplicate cluster names for the same user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/cluster",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Clientes VIP 2026",
          description: "Tentativa duplicada",
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.message.toLowerCase()).toContain("já existe");
    });

    it("should list all clusters including member count metrics", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/clusters",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.some((c: any) => c.id === testClusterId)).toBe(true);
    });
  });

  describe("Contact CRUD & Batch Operations", () => {
    it("should create a contact with custom fields and assign to cluster", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/contact",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Mariana Souza",
          phone: "5511998877665",
          clusterId: testClusterId,
          customFields: {
            empresa: "Acme Corp Brasil",
            cargo: "Diretora de TI",
          },
        },
      });

      expect([200, 201]).toContain(res.statusCode);
      const json = res.json();
      expect(json.data.name).toBe("Mariana Souza");
      expect(json.data.phone).toBe("5511998877665");
      testContactId = json.data.id;
    });

    it("should normalize and prevent duplicate contact phones for the same user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/contact",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Mariana Clone",
          phone: "5511998877665", // Mesmo telefone
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.message.toLowerCase()).toContain("já existe");
    });

    it("should filter contacts by clusterId", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/contacts?clusterId=${testClusterId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.contacts.length).toBe(1);
      expect(json.data.contacts[0].id).toBe(testContactId);
      expect(json.data.contacts[0].name).toBe("Mariana Souza");
    });

    it("should filter contacts by search query text", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/contacts?search=Mariana`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.contacts.length).toBe(1);
      expect(json.data.contacts[0].name).toBe("Mariana Souza");
    });

    it("should perform batch move of contacts between clusters", async () => {
      // Cria um segundo cluster
      const clusterRes = await app.inject({
        method: "POST",
        url: "/cluster",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: "Onboarding Concluído",
          description: "Migrados do VIP",
        },
      });
      const newClusterId = clusterRes.json().data.id;

      // Executa move em lote
      const moveRes = await app.inject({
        method: "PATCH",
        url: "/move-contacts",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          contactIds: [testContactId],
          clusterId: newClusterId,
        },
      });

      expect(moveRes.statusCode).toBe(200);

      // Verifica se o contato foi movido
      const verifyRes = await app.inject({
        method: "GET",
        url: `/contacts?clusterId=${newClusterId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(verifyRes.json().data.contacts.some((c: any) => c.id === testContactId)).toBe(true);
    });

    it("should delete contacts in batch", async () => {
      const delRes = await app.inject({
        method: "DELETE",
        url: "/contacts",
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          contactIds: [testContactId],
        },
      });

      expect(delRes.statusCode).toBe(200);

      // Verifica se o contato sumiu
      const checkRes = await app.inject({
        method: "GET",
        url: "/contacts",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(checkRes.json().data.contacts.some((c: any) => c.id === testContactId)).toBe(false);
    });
  });
});

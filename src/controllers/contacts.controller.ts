import { prisma } from "@/lib/prisma.client";
import type { Body } from "@/lib/types/utils";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { AppError } from "@/lib/appError";
import { WhatsAppManager } from "@/lib/wpp/whatsapp.manager";
import { LoggerService } from "@/lib/services/logger.service";
import { ActionEngine } from "@/lib/engine/action-engine";
import type {
  CreateContactRequest,
  MoveContactsRequest,
  DeleteContactsRequest,
  CreateClusterRequest,
  UpdateClusterRequest,
  SendBulkMessageRequest,
} from "@/lib/types/dtos";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const contactsController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Lista todos os contatos com clusters (Many-to-Many), campos dinâmicos e definições
  fastify.get("/contacts", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { search, clusterId, clusterIds } = req.query as {
      search?: string;
      clusterId?: string;
      clusterIds?: string;
    };

    const whereClause: any = { userId };

    // Filtro por cluster único ou múltiplos clusters
    if (clusterIds) {
      const ids = clusterIds.split(",").map(Number).filter(Boolean);
      if (ids.length > 0) {
        whereClause.OR = [
          { clusterId: { in: ids } },
          { Clusters: { some: { clusterId: { in: ids } } } },
        ];
      }
    } else if (clusterId) {
      if (clusterId === "null" || clusterId === "none") {
        whereClause.clusterId = null;
        whereClause.Clusters = { none: {} };
      } else {
        const cId = Number(clusterId);
        whereClause.OR = [
          { clusterId: cId },
          { Clusters: { some: { clusterId: cId } } },
        ];
      }
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { customFields: { contains: search } },
          ],
        },
      ];
    }

    const contacts = await prisma.contacts.findMany({
      where: whereClause,
      include: {
        Cluster: {
          select: { id: true, name: true },
        },
        Clusters: {
          include: {
            Cluster: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const clusters = await prisma.contactCluster.findMany({
      where: { userId },
      include: {
        _count: {
          select: { Contacts: true, ContactRelations: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const customFieldDefs = await prisma.customFieldDefinition.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // Formata os contatos para unificar clusters legados e many-to-many
    const formattedContacts = contacts.map((c) => {
      const clusterMap = new Map<number, { id: number; name: string }>();
      if (c.Cluster) clusterMap.set(c.Cluster.id, c.Cluster);
      if (c.Clusters) {
        for (const rel of c.Clusters) {
          if (rel.Cluster) clusterMap.set(rel.Cluster.id, rel.Cluster);
        }
      }

      let parsedCustomFields: Record<string, any> = {};
      try {
        if (c.customFields) parsedCustomFields = JSON.parse(c.customFields);
      } catch {}

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        lastInteraction: c.lastInteraction,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        clusterId: c.clusterId,
        clusters: Array.from(clusterMap.values()),
        customFields: parsedCustomFields,
      };
    });

    const totalBaseContactsCount = await prisma.contacts.count({ where: { userId } });

    return mountApiResponse({
      contacts: formattedContacts,
      totalCount: totalBaseContactsCount,
      clusters: clusters.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        totalContacts: Math.max(c._count.Contacts, c._count.ContactRelations),
      })),
      customFieldDefs,
    });
  });

  // Criar novo contato manualmente
  fastify.post("/contact", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { name, phone, clusterIds, clusterId, customFields } = req.body as any;

    if (!name || !phone) {
      throw new AppError("Nome e telefone são obrigatórios!", 400);
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const exists = await prisma.contacts.findFirst({
      where: { userId, phone: cleanPhone },
    });

    if (exists) {
      throw new AppError("Contato com este número já existe!", 400);
    }

    const targetClusterIds: number[] = Array.isArray(clusterIds)
      ? clusterIds.map(Number)
      : clusterId
      ? [Number(clusterId)]
      : [];

    const contact = await prisma.contacts.create({
      data: {
        name,
        phone: cleanPhone,
        userId,
        clusterId: targetClusterIds[0] ?? null,
        customFields: customFields ? JSON.stringify(customFields) : "{}",
        lastInteraction: new Date(),
      },
    });

    // Vincula a múltiplos clusters
    if (targetClusterIds.length > 0) {
      for (const cId of targetClusterIds) {
        await prisma.contactClusterRelation.upsert({
          where: { contactId_clusterId: { contactId: contact.id, clusterId: cId } },
          create: { contactId: contact.id, clusterId: cId },
          update: {},
        });
      }
    }

    await LoggerService.log({
      userId,
      eventType: "CONTACT_CREATED",
      contactPhone: cleanPhone,
      contactName: name,
      description: `Contato ${name} criado manualmente.`,
    });

    return mountApiResponse(contact, "Contato criado com sucesso!");
  });

  // Enviar mensagem direta para um contato específico com interpolação de variáveis
  fastify.post<Body<{ message: string }> & { Params: { id: string } }>(
    "/contacts/:id/send-message",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const contactId = Number(req.params.id);
      const { message } = req.body;

      if (!message || !message.trim()) {
        throw new AppError("A mensagem é obrigatória!", 400);
      }

      const contact = await prisma.contacts.findFirst({
        where: { id: contactId, userId },
      });

      if (!contact) {
        throw new AppError("Contato não encontrado!", 404);
      }

      const text = ActionEngine.formatVariables(message, contact);
      await WhatsAppManager.sendMessage(userId, contact.phone, text);

      await LoggerService.log({
        userId,
        eventType: "MSG_SENT",
        contactPhone: contact.phone,
        contactName: contact.name,
        message: text,
        description: `Mensagem enviada para ${contact.name} (${contact.phone}).`,
      });

      return mountApiResponse({}, "Mensagem enviada com sucesso!");
    }
  );

  // Atualizar contato individual
  fastify.put<{ Params: { id: string } }>("/contacts/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const contactId = Number(req.params.id);
    const { name, phone, clusterIds, customFields } = req.body as any;

    const existing = await prisma.contacts.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      throw new AppError("Contato não encontrado!", 404);
    }

    const cleanPhone = phone ? phone.replace(/\D/g, "") : existing.phone;
    const targetClusterIds: number[] = Array.isArray(clusterIds) ? clusterIds.map(Number) : [];

    const updated = await prisma.contacts.update({
      where: { id: contactId },
      data: {
        name: name ?? existing.name,
        phone: cleanPhone,
        clusterId: targetClusterIds[0] ?? null,
        customFields: customFields ? JSON.stringify(customFields) : existing.customFields,
      },
    });

    // Atualiza relações many-to-many com clusters
    if (Array.isArray(clusterIds)) {
      await prisma.contactClusterRelation.deleteMany({
        where: { contactId },
      });
      for (const cId of targetClusterIds) {
        await prisma.contactClusterRelation.create({
          data: { contactId, clusterId: cId },
        });
      }
    }

    return mountApiResponse(updated, "Contato atualizado com sucesso!");
  });

  // Gerenciar relações em lote com clusters (Adicionar / Remover)
  fastify.post("/contacts/batch-clusters", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { contactIds, clusterIds, action } = req.body as {
      contactIds: number[];
      clusterIds: number[];
      action: "ADD" | "REMOVE" | "SET";
    };

    if (!contactIds || contactIds.length === 0 || !clusterIds || clusterIds.length === 0) {
      throw new AppError("Selecione contatos e clusters!", 400);
    }

    for (const cId of contactIds) {
      if (action === "ADD" || action === "SET") {
        if (action === "SET") {
          await prisma.contactClusterRelation.deleteMany({ where: { contactId: cId } });
        }
        for (const clId of clusterIds) {
          await prisma.contactClusterRelation.upsert({
            where: { contactId_clusterId: { contactId: cId, clusterId: clId } },
            create: { contactId: cId, clusterId: clId },
            update: {},
          });
        }
        await prisma.contacts.update({
          where: { id: cId },
          data: { clusterId: clusterIds[0] },
        });
      } else if (action === "REMOVE") {
        await prisma.contactClusterRelation.deleteMany({
          where: { contactId: cId, clusterId: { in: clusterIds } },
        });
      }
    }

    await LoggerService.log({
      userId,
      eventType: "CONTACT_UPDATED",
      description: `${contactIds.length} contato(s) atualizados com ação ${action} em clusters.`,
    });

    return mountApiResponse({}, "Clusters atualizados em lote com sucesso!");
  });

  // Atualizar campo dinâmico em lote
  fastify.post("/contacts/batch-field", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { contactIds, fieldKey, fieldValue } = req.body as {
      contactIds: number[];
      fieldKey: string;
      fieldValue: string;
    };

    if (!contactIds || contactIds.length === 0 || !fieldKey) {
      throw new AppError("Contatos e chave do campo são obrigatórios!", 400);
    }

    const contacts = await prisma.contacts.findMany({
      where: { id: { in: contactIds }, userId },
    });

    for (const c of contacts) {
      let currentFields: Record<string, any> = {};
      try {
        if (c.customFields) currentFields = JSON.parse(c.customFields);
      } catch {}
      currentFields[fieldKey] = fieldValue;

      await prisma.contacts.update({
        where: { id: c.id },
        data: { customFields: JSON.stringify(currentFields) },
      });
    }

    return mountApiResponse({}, "Campos dinâmicos atualizados com sucesso!");
  });

  // Excluir múltiplos contatos
  fastify.delete<Body<DeleteContactsRequest>>("/contacts", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { contactIds } = req.body;

    if (!contactIds || contactIds.length === 0) {
      throw new AppError("Nenhum contato selecionado para exclusão.", 400);
    }

    await prisma.contacts.deleteMany({
      where: {
        id: { in: contactIds },
        userId,
      },
    });

    await LoggerService.log({
      userId,
      eventType: "CONTACT_UPDATED",
      description: `${contactIds.length} contato(s) excluído(s).`,
    });

    return mountApiResponse({}, "Contatos excluídos com sucesso!");
  });

  // Gerenciamento de Definições de Campos Customizados (Banco Dinâmico)
  fastify.get("/custom-fields", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const fields = await prisma.customFieldDefinition.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const parsedFields = fields.map((f) => {
      let extra: any = {};
      try {
        if (f.options) {
          const parsed = JSON.parse(f.options);
          if (Array.isArray(parsed)) {
            extra = { options: parsed };
          } else if (typeof parsed === "object" && parsed !== null) {
            extra = parsed;
          }
        }
      } catch (e) {
        extra = {};
      }
      return {
        ...f,
        ...extra,
      };
    });

    return mountApiResponse(parsedFields);
  });

  fastify.post("/custom-fields", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const {
      key,
      label,
      type,
      options,
      mask,
      regex,
      min,
      max,
      description,
      placeholder,
      required,
      defaultValue,
    } = req.body as any;

    if (!key || !label) {
      throw new AppError("Chave e rótulo do campo são obrigatórios!", 400);
    }

    const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");

    const richConfig = {
      options: Array.isArray(options) ? options : [],
      mask: mask || undefined,
      regex: regex || undefined,
      min: min !== undefined && min !== "" ? Number(min) : undefined,
      max: max !== undefined && max !== "" ? Number(max) : undefined,
      description: description || undefined,
      placeholder: placeholder || undefined,
      required: Boolean(required),
      defaultValue: defaultValue || undefined,
    };

    const field = await prisma.customFieldDefinition.upsert({
      where: { userId_key: { userId, key: cleanKey } },
      create: {
        userId,
        key: cleanKey,
        label,
        type: type || "TEXT",
        options: JSON.stringify(richConfig),
      },
      update: {
        label,
        type: type || "TEXT",
        options: JSON.stringify(richConfig),
      },
    });

    return mountApiResponse({ ...field, ...richConfig }, "Campo dinâmico salvo com sucesso!");
  });

  fastify.delete<{ Params: { id: string } }>("/custom-fields/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const id = Number(req.params.id);

    await prisma.customFieldDefinition.deleteMany({
      where: { id, userId },
    });

    return mountApiResponse({}, "Campo dinâmico removido!");
  });

  // Enviar mensagem em massa para contatos selecionados
  fastify.post<Body<SendBulkMessageRequest>>("/contacts/send-bulk", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { contactIds, message } = req.body;

    if (!contactIds || contactIds.length === 0 || !message) {
      throw new AppError("Contatos e mensagem são obrigatórios!", 400);
    }

    const contacts = await prisma.contacts.findMany({
      where: { id: { in: contactIds }, userId },
    });

    let successCount = 0;
    for (const contact of contacts) {
      try {
        const text = ActionEngine.formatVariables(message, contact);
        await WhatsAppManager.sendMessage(userId, contact.phone, text);
        successCount++;
      } catch (err) {
        console.error(`Erro ao enviar mensagem para ${contact.phone}:`, err);
      }
    }

    return mountApiResponse(
      { total: contacts.length, success: successCount },
      `${successCount} de ${contacts.length} mensagens enviadas com sucesso!`
    );
  });

  // ================= CLUSTERS ================= //

  // Criar Cluster
  fastify.post<Body<CreateClusterRequest>>("/clusters", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { name, description } = req.body;

    if (!name) {
      throw new AppError("O nome do cluster é obrigatório!", 400);
    }

    const exists = await prisma.contactCluster.findFirst({
      where: { userId, name },
    });

    if (exists) {
      throw new AppError("Já existe um cluster com este nome!", 400);
    }

    const cluster = await prisma.contactCluster.create({
      data: {
        name,
        description,
        userId,
      },
    });

    await LoggerService.log({
      userId,
      eventType: "CLUSTER_CREATED",
      description: `Cluster "${name}" criado.`,
    });

    return mountApiResponse(cluster, "Cluster criado com sucesso!");
  });

  // Atualizar Cluster
  fastify.put<Body<UpdateClusterRequest> & { Params: { id: string } }>(
    "/clusters/:id",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const clusterId = Number(req.params.id);
      const { name, description } = req.body;

      const cluster = await prisma.contactCluster.update({
        where: { id: clusterId, userId },
        data: { name, description },
      });

      await LoggerService.log({
        userId,
        eventType: "CLUSTER_UPDATED",
        description: `Cluster "${name}" atualizado.`,
      });

      return mountApiResponse(cluster, "Cluster atualizado com sucesso!");
    }
  );

  // Excluir Cluster
  fastify.delete<{ Params: { id: string } }>("/clusters/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const clusterId = Number(req.params.id);

    await prisma.contactClusterRelation.deleteMany({
      where: { clusterId },
    });

    await prisma.contacts.updateMany({
      where: { clusterId, userId },
      data: { clusterId: null },
    });

    await prisma.contactCluster.delete({
      where: { id: clusterId, userId },
    });

    await LoggerService.log({
      userId,
      eventType: "CLUSTER_DELETED",
      description: `Cluster #${clusterId} excluído.`,
    });

    return mountApiResponse({}, "Cluster excluído com sucesso!");
  });

  // Buscar contatos detalhados de um cluster específico
  fastify.get<{ Params: { id: string } }>("/clusters/:id/contacts", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const clusterId = Number(req.params.id);

    const cluster = await prisma.contactCluster.findFirst({
      where: { id: clusterId, userId },
      include: {
        ContactRelations: {
          include: { Contact: true },
        },
      },
    });

    if (!cluster) {
      throw new AppError("Cluster não encontrado!", 404);
    }

    const directContacts = await prisma.contacts.findMany({
      where: { clusterId, userId },
    });

    const relatedContacts = (cluster.ContactRelations || []).map((r) => r.Contact);
    const contactsMap = new Map<number, any>();
    for (const c of [...directContacts, ...relatedContacts]) {
      if (c && !contactsMap.has(c.id)) {
        let parsedCustomFields: Record<string, any> = {};
        try {
          if (c.customFields) parsedCustomFields = JSON.parse(c.customFields);
        } catch {}
        contactsMap.set(c.id, { ...c, customFields: parsedCustomFields });
      }
    }

    const clusterContacts = Array.from(contactsMap.values());
    return mountApiResponse({
      cluster: {
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
      },
      contacts: clusterContacts,
      totalContacts: clusterContacts.length,
    });
  });

  // Enviar mensagem em massa para todos os contatos de um cluster
  fastify.post<Body<{ message: string }> & { Params: { id: string } }>(
    "/clusters/:id/send-message",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const clusterId = Number(req.params.id);
      const { message } = req.body;

      if (!message || !message.trim()) {
        throw new AppError("A mensagem é obrigatória!", 400);
      }

      const cluster = await prisma.contactCluster.findFirst({
        where: { id: clusterId, userId },
        include: {
          ContactRelations: {
            include: { Contact: true },
          },
        },
      });

      if (!cluster) {
        throw new AppError("Cluster não encontrado!", 404);
      }

      // Reúne contatos associados (relação N:N ou clusterId direto)
      const directContacts = await prisma.contacts.findMany({
        where: { clusterId, userId },
      });

      const relatedContacts = (cluster.ContactRelations || []).map((r) => r.Contact);
      const contactsMap = new Map<number, any>();
      for (const c of [...directContacts, ...relatedContacts]) {
        if (c && !contactsMap.has(c.id)) {
          contactsMap.set(c.id, c);
        }
      }

      const contacts = Array.from(contactsMap.values());
      if (contacts.length === 0) {
        throw new AppError("O cluster selecionado não possui contatos para envio.", 400);
      }

      let successCount = 0;
      for (const contact of contacts) {
        try {
          const text = ActionEngine.formatVariables(message, contact);
          await WhatsAppManager.sendMessage(userId, contact.phone, text);
          successCount++;
        } catch (err) {
          console.error(`Erro ao enviar mensagem para ${contact.phone}:`, err);
        }
      }

      await LoggerService.log({
        userId,
        eventType: "MSG_SENT",
        description: `Disparo para o cluster "${cluster.name}": ${successCount} de ${contacts.length} enviadas.`,
        metadata: JSON.stringify({ clusterId, clusterName: cluster.name, total: contacts.length, success: successCount }),
      });

      return mountApiResponse(
        { total: contacts.length, success: successCount },
        `${successCount} de ${contacts.length} mensagens enviadas para o cluster "${cluster.name}"!`
      );
    }
  );
};

import { prisma } from "@/lib/prisma.client";
import type { Body } from "@/lib/types/utils";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { AppError } from "@/lib/appError";
import { LoggerService } from "@/lib/services/logger.service";
import type { CreateTriggerRequest } from "@/lib/types/dtos";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const triggersController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Listar todos os gatilhos
  fastify.get("/triggers", async (req, reply) => {
    const userId = (req.user as { id: string }).id;

    const triggers = await prisma.trigger.findMany({
      where: {
        userId,
        kind: "SCHEDULED",
      },
      include: {
        TemporalCondition: true,
        ResponseTriggerRelation: {
          include: { Response: true },
        },
        TriggerClusterRelation: {
          include: { TriggerCluster: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return mountApiResponse(
      triggers.map((t) => ({
        id: t.id,
        name: t.name,
        active: t.active,
        usageCount: t.usageCount,
        condition: t.TemporalCondition
          ? {
              type: t.TemporalCondition.type,
              targetTime: t.TemporalCondition.targetTime,
              inactivityDays: t.TemporalCondition.inactivityDays,
              cron: t.TemporalCondition.cron,
            }
          : null,
        responses: t.ResponseTriggerRelation.map((rel) => ({
          id: rel.Response.id,
          content: rel.Response.content,
        })),
        clusters: t.TriggerClusterRelation.map((rel) => ({
          id: rel.triggerClusterId,
          name: rel.TriggerCluster?.name ?? `Cluster #${rel.triggerClusterId}`,
        })),
        createdAt: t.createdAt,
      }))
    );
  });

  // Criar Gatilho
  fastify.post<Body<CreateTriggerRequest>>("/triggers", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { name, active = true, type, targetTime, inactivityDays, clusterIds = [], responses } = req.body;

    if (!name || !type || !responses || responses.length === 0) {
      throw new AppError("Nome, tipo e mensagens de resposta são obrigatórios!", 400);
    }

    const trigger = await prisma.trigger.create({
      data: {
        name,
        active,
        userId,
        kind: "SCHEDULED",
        TemporalCondition: {
          create: {
            type,
            targetTime: targetTime ?? null,
            inactivityDays: inactivityDays ? Number(inactivityDays) : null,
          },
        },
      },
    });

    // Cria respostas
    for (const resp of responses) {
      const createdResp = await prisma.response.create({
        data: {
          content: resp.content,
          type: resp.type ?? "TEXTO",
        },
      });

      await prisma.responseTriggerRelation.create({
        data: {
          triggerId: trigger.id,
          responseId: createdResp.id,
        },
      });
    }

    // Associa clusters
    for (const clusterId of clusterIds) {
      await prisma.triggerClusterRelation.create({
        data: {
          triggerId: trigger.id,
          triggerClusterId: Number(clusterId),
          included: true,
        },
      });
    }

    await LoggerService.log({
      userId,
      eventType: "TRIGGER_EXECUTED",
      automationType: "TRIGGER",
      automationId: trigger.id,
      description: `Gatilho "${name}" criado com sucesso.`,
    });

    return mountApiResponse(trigger, "Gatilho criado com sucesso!");
  });

  // Ativar / Desativar Gatilho (Toggle inteligente)
  fastify.patch<{ Params: { id: string } }>(
    "/triggers/:id/toggle",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const id = Number(req.params.id);

      const current = await prisma.trigger.findFirst({ where: { id, userId } });
      if (!current) throw new AppError("Gatilho não encontrado!", 404);

      const trigger = await prisma.trigger.update({
        where: { id, userId },
        data: { active: !current.active },
      });

      return mountApiResponse(
        trigger,
        trigger.active ? "Gatilho ativado com sucesso!" : "Gatilho pausado com sucesso!"
      );
    }
  );

  fastify.patch<Body<{ active?: boolean }> & { Params: { id: string } }>(
    "/triggers/:id/active",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const id = Number(req.params.id);
      let active = req.body?.active;

      if (active === undefined) {
        const current = await prisma.trigger.findFirst({ where: { id, userId } });
        if (!current) throw new AppError("Gatilho não encontrado!", 404);
        active = !current.active;
      }

      const trigger = await prisma.trigger.update({
        where: { id, userId },
        data: { active },
      });

      return mountApiResponse(
        trigger,
        active ? "Gatilho ativado com sucesso!" : "Gatilho desativado com sucesso!"
      );
    }
  );

  // Excluir Gatilho
  fastify.delete<{ Params: { id: string } }>("/triggers/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const id = Number(req.params.id);

    await prisma.trigger.delete({
      where: { id, userId },
    });

    return mountApiResponse({}, "Gatilho excluído com sucesso!");
  });
};

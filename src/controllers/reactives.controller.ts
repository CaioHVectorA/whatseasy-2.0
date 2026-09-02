import { prisma } from "@/lib/prisma.client";
import type { Body } from "@/lib/types/utils";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { AppError } from "@/lib/appError";
import { LoggerService } from "@/lib/services/logger.service";
import type { CreateReactiveRequest, UpdateReactiveRequest } from "@/lib/types/dtos";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const reactiveController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Listar todos os reativos
  fastify.get("/reactives", async (req, reply) => {
    const userId = (req.user as { id: string }).id;

    const reactives = await prisma.trigger.findMany({
      where: {
        userId,
        kind: "REACTIVE",
      },
      include: {
        TextTrigger: true,
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
      reactives.map((r) => ({
        id: r.id,
        name: r.name,
        active: r.active,
        delaySeconds: r.delaySeconds,
        usageCount: r.usageCount,
        actionType: r.actionType,
        actionConfig: r.actionConfig ? (typeof r.actionConfig === "string" ? JSON.parse(r.actionConfig) : r.actionConfig) : null,
        textTriggers: r.TextTrigger.map((t) => ({ id: t.id, text: t.text, type: t.type })),
        responses: r.ResponseTriggerRelation.map((rel) => ({
          id: rel.Response.id,
          content: rel.Response.content,
          type: rel.Response.type,
        })),
        clusters: r.TriggerClusterRelation.map((rel) => ({
          id: rel.triggerClusterId,
          name: rel.TriggerCluster?.name ?? `Cluster #${rel.triggerClusterId}`,
          included: rel.included,
        })),
        createdAt: r.createdAt,
      }))
    );
  });

  // Criar Reativo
  fastify.post<Body<CreateReactiveRequest>>("/reactives", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { name, active = true, textTriggers, responses, clusterIds = [], delaySeconds = 0, actionType, actionConfig } = req.body;

    if (!name || !textTriggers || textTriggers.length === 0 || !responses || responses.length === 0) {
      throw new AppError("Nome, condições de texto e respostas são obrigatórios!", 400);
    }

    const reactive = await prisma.trigger.create({
      data: {
        name,
        active,
        userId,
        kind: "REACTIVE",
        delaySeconds: Number(delaySeconds) || 0,
        actionType: actionType ?? null,
        actionConfig: actionConfig ? JSON.stringify(actionConfig) : null,
        TextTrigger: {
          create: textTriggers.map((t) => ({
            text: t.text,
            type: t.type,
          })),
        },
      },
    });

    // Cria respostas associadas
    for (const resp of responses) {
      const createdResp = await prisma.response.create({
        data: {
          content: resp.content,
          type: resp.type ?? "TEXTO",
        },
      });

      await prisma.responseTriggerRelation.create({
        data: {
          triggerId: reactive.id,
          responseId: createdResp.id,
        },
      });
    }

    // Associa clusters alvos se informados
    for (const clusterId of clusterIds) {
      await prisma.triggerClusterRelation.create({
        data: {
          triggerId: reactive.id,
          triggerClusterId: Number(clusterId),
          included: true,
        },
      });
    }

    await LoggerService.log({
      userId,
      eventType: "REACTIVE_TRIGGERED",
      automationType: "REACTIVE",
      automationId: reactive.id,
      description: `Reativo "${name}" criado com sucesso.`,
    });

    return mountApiResponse(reactive, "Reativo criado com sucesso!");
  });

  // Ativar / Desativar Reativo (Toggle inteligente)
  fastify.patch<{ Params: { id: string } }>(
    "/reactives/:id/toggle",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const id = Number(req.params.id);

      const current = await prisma.trigger.findFirst({ where: { id, userId } });
      if (!current) throw new AppError("Reativo não encontrado!", 404);

      const reactive = await prisma.trigger.update({
        where: { id, userId },
        data: { active: !current.active },
      });

      return mountApiResponse(
        reactive,
        reactive.active ? "Reativo ativado com sucesso!" : "Reativo pausado com sucesso!"
      );
    }
  );

  fastify.patch<Body<{ active?: boolean }> & { Params: { id: string } }>(
    "/reactives/:id/active",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const id = Number(req.params.id);
      let active = req.body?.active;

      if (active === undefined) {
        const current = await prisma.trigger.findFirst({ where: { id, userId } });
        if (!current) throw new AppError("Reativo não encontrado!", 404);
        active = !current.active;
      }

      const reactive = await prisma.trigger.update({
        where: { id, userId },
        data: { active },
      });

      return mountApiResponse(
        reactive,
        active ? "Reativo ativado com sucesso!" : "Reativo desativado com sucesso!"
      );
    }
  );

  // Atualizar Reativo
  fastify.put<Body<UpdateReactiveRequest> & { Params: { id: string } }>(
    "/reactives/:id",
    async (req, reply) => {
      const userId = (req.user as { id: string }).id;
      const id = Number(req.params.id);
      const { name, active, textTriggers, responses, clusterIds = [], delaySeconds = 0, actionType, actionConfig } = req.body;

      const reactive = await prisma.trigger.update({
        where: { id, userId },
        data: {
          name,
          active: active ?? true,
          delaySeconds: Number(delaySeconds) || 0,
          actionType: actionType ?? null,
          actionConfig: actionConfig ? JSON.stringify(actionConfig) : null,
        },
      });

      // Recria condições de texto
      if (textTriggers) {
        await prisma.textTrigger.deleteMany({ where: { triggerId: id } });
        await prisma.textTrigger.createMany({
          data: textTriggers.map((t) => ({
            text: t.text,
            type: t.type,
            triggerId: id,
          })),
        });
      }

      // Recria respostas
      if (responses) {
        await prisma.responseTriggerRelation.deleteMany({ where: { triggerId: id } });
        for (const resp of responses) {
          const createdResp = await prisma.response.create({
            data: {
              content: resp.content,
              type: resp.type ?? "TEXTO",
            },
          });
          await prisma.responseTriggerRelation.create({
            data: {
              triggerId: id,
              responseId: createdResp.id,
            },
          });
        }
      }

      // Recria relações de clusters
      await prisma.triggerClusterRelation.deleteMany({ where: { triggerId: id } });
      for (const clusterId of clusterIds) {
        await prisma.triggerClusterRelation.create({
          data: {
            triggerId: id,
            triggerClusterId: Number(clusterId),
            included: true,
          },
        });
      }

      return mountApiResponse(reactive, "Reativo atualizado com sucesso!");
    }
  );

  // Excluir Reativo
  fastify.delete<{ Params: { id: string } }>("/reactives/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const id = Number(req.params.id);

    await prisma.trigger.delete({
      where: { id, userId },
    });

    return mountApiResponse({}, "Reativo excluído com sucesso!");
  });
};

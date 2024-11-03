import { prisma } from "@/lib/prisma.client";
import type { Body } from "@/lib/types/utils";
import { mountApiResponse } from "@/lib/ws/mount-response";
import type { ReactiveInput } from "@/types/reactive";
import type { TriggerCluster } from "@prisma/client";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const reactiveController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  fastify.get("/reactives", async (req, reply) => {
    const user = req.me;
    const reactives = await prisma.trigger.findMany({
      where: {
        userId: user.id,
      },
    });
    return reactives;
  });
  fastify.post<Body<ReactiveInput>>("/reactive", async (req, reply) => {
    const user = req.me;
    const {
      active,
      clusterTrigger,
      name,
      responses,
      textTrigger,
      temporalCondition,
    } = req.body;
    const trigger = await prisma.trigger.create({
      data: { name, active, userId: user.id },
    });
    if (clusterTrigger.length > 0) {
      for (const cluster of clusterTrigger) {
        if (cluster.type == "REF") {
          await prisma.triggerClusterRelation.create({
            data: {
              triggerId: trigger.id,
              triggerClusterId: cluster.clusterTriggerId,
            },
          });
          continue;
        }
        let _trigger;
        const alreadyExists = await prisma.triggerCluster.findFirst({
          where: { clusterId: cluster.id, inside: cluster.inside },
        });
        _trigger = alreadyExists;
        if (!alreadyExists)
          _trigger = prisma.triggerCluster.create({
            data: { inside: cluster.inside, clusterId: cluster.id },
          });
        await prisma.triggerClusterRelation.create({
          data: {
            triggerId: trigger.id,
            triggerClusterId: (_trigger as TriggerCluster).id,
          },
        });
      }
    }
    if (textTrigger.length > 0) {
      for (const { text, type } of textTrigger) {
        await prisma.textTrigger.create({
          data: { text, type, triggerId: trigger.id },
        });
      }
    }
    if (temporalCondition) {
      await prisma.temporalCondition.create({
        data: {
          initial_date: new Date(temporalCondition.initial),
          final_date: new Date(temporalCondition.final),
          triggerId: trigger.id,
        },
      });
    }
    if (responses.type == "REFS") {
      for (const responseId of responses.responseIds) {
        await prisma.responseTriggerRelation.create({
          data: { responseId, triggerId: trigger.id },
        });
      }
    }
    if (responses.type == "CREATE") {
      for (const { content, format } of responses.data) {
        const response = await prisma.response.create({
          data: { content, type: format },
        });
        await prisma.responseTriggerRelation.create({
          data: { responseId: response.id, triggerId: trigger.id },
        });
      }
    }
    return mountApiResponse(trigger, "Reativo criado com sucesso!");
  });
  fastify.put<Body<{ active: boolean }> & { Params: { id: string } }>("/reactive-active/:id", async (req, reply) => {
    const reactiveId = req.params.id;
    const active = req.body.active;
    const trigger = await prisma.trigger.update({
      where: { id: Number(reactiveId) },
      data: { active },
      select: { id: true, active: true },
    });
    return mountApiResponse(trigger, "Reativo atualizado com sucesso!");
  })
  fastify.put<Body<ReactiveInput> & { Params: { id: string } }>(
    "/reactive/:id",
    async (req, reply) => {
      const reactiveId = req.params.id;
      const {
        active,
        clusterTrigger,
        name,
        responses,
        textTrigger,
        temporalCondition,
      } = req.body;
      const trigger = await prisma.trigger.update({
        where: { id: Number(reactiveId) },
        data: { name, active },
      });
      if (!trigger) return mountApiResponse(null, "Reativo não encontrado!");
      if (clusterTrigger.length > 0) {
        for (const cluster of clusterTrigger) {
          if (cluster.type == "REF") {
            await prisma.triggerClusterRelation.create({
              data: {
                triggerId: trigger.id,
                triggerClusterId: cluster.clusterTriggerId,
              },
            });
            continue;
          }
          let _trigger;
          const alreadyExists = await prisma.triggerCluster.findFirst({
            where: { clusterId: cluster.id, inside: cluster.inside },
          });
          _trigger = alreadyExists;
          if (!alreadyExists)
            _trigger = prisma.triggerCluster.create({
              data: { inside: cluster.inside, clusterId: cluster.id },
            });
          await prisma.triggerClusterRelation.create({
            data: {
              triggerId: trigger.id,
              triggerClusterId: (_trigger as TriggerCluster).id,
            },
          });
        }
      }
      if (textTrigger.length > 0) {
        for (const { text, type } of textTrigger) {
          const alreadyExists = await prisma.textTrigger.findFirst({
            where: { triggerId: trigger.id, text },
          });
          if (alreadyExists) {
            await prisma.textTrigger.update({
              where: { id: alreadyExists.id },
              data: { type },
            });
            continue;
          }
          await prisma.textTrigger.create({
            data: { text, type, triggerId: trigger.id },
          });
        }
      }
      if (temporalCondition) {
        const alreadyExists = await prisma.temporalCondition.findFirst({
          where: { triggerId: trigger.id },
        });
        if (alreadyExists) {
          await prisma.temporalCondition.update({
            where: { id: alreadyExists.id },
            data: {
              initial_date: new Date(temporalCondition.initial),
              final_date: new Date(temporalCondition.final),
            },
          });
        } else {
          await prisma.temporalCondition.create({
            data: {
              initial_date: new Date(temporalCondition.initial),
              final_date: new Date(temporalCondition.final),
              triggerId: trigger.id,
            },
          });
        }
      }
      if (responses.type == "REFS") {
        for (const responseId of responses.responseIds) {
          const alreadyExists = await prisma.responseTriggerRelation.findFirst({
            where: { triggerId: trigger.id, responseId },
          });
          if (alreadyExists) continue;
          await prisma.responseTriggerRelation.create({
            data: { responseId, triggerId: trigger.id },
          });
        }
      }
      if (responses.type == "CREATE") {
        // for (const { content, format } of responses.data) {
        //     const alreadyExists = await prisma.response.findFirst({ where: { triggerId: trigger.id, content } })
        //     if (alreadyExists) {
        //         await prisma.response.update({ where: { id: alreadyExists.id }, data: { type: format, content } })
        //         continue;
        //     }
        //     await prisma.response.create({ data: { content, type: format, triggerId: trigger.id } })
        //     await prisma.responseTriggerRelation.create({ data: { responseId: trigger.id, triggerId: trigger.id } })
        //     await prisma
        // }
        await prisma.response.deleteMany({
          where: {
            ResponseTriggerRelation: {
              some: { triggerId: trigger.id },
            },
          },
        });
        await prisma.responseTriggerRelation.deleteMany({
          where: { triggerId: trigger.id },
        });
        for (const { content, format } of responses.data) {
          const response = await prisma.response.create({
            data: { content, type: format },
          });
          await prisma.responseTriggerRelation.create({
            data: { responseId: response.id, triggerId: trigger.id },
          });
        }
      }
      return mountApiResponse(trigger, "Reativo atualizado com sucesso!");
    }
  );
  fastify.get("/get-reactive-data/", async (req, reply) => {
    // data used to show in the dashboard:
    // reactives_today, more_used_reactive, responses_today, overall_reactive, all reactives
    // gatilhos ativados hoje, gatilho mais usado, respostas hoje, gatilhos totais, todos os gatilhos
    const user = req.me;
    const reactives = await prisma.trigger.findMany({
      where: { userId: user.id },
    });
    const todayDate = new Date();
    const yesterdayDate = new Date(
      new Date().setTime(todayDate.getTime() - 1 * 86400000)
    );
    const reactives_today = await prisma.triggerLog.count({
      where: {
        createdAt: { lte: todayDate, gte: yesterdayDate },
        Trigger: { userId: user.id },
      },
    });
    const overall_reactive = await prisma.trigger.count({
      where: { userId: user.id },
    });
    const responses_today = await prisma.responseLog.count({
      where: {
        createdAt: { lte: todayDate, gte: yesterdayDate },
        Response: {
          ResponseTriggerRelation: {
            some: {
              Trigger: {
                userId: user.id,
              },
            },
          },
        },
      },
    });
    const all_reactives = (
      await prisma.trigger.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          active: true,
          createdAt: true,
          name: true,
          order: true,
          usageCount: true,
          userId: true,
          TriggerLog: {
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    ).map((trigger) => ({
      ...trigger,
      count_used: trigger.TriggerLog.length,
      lastResponse: trigger.TriggerLog[0]?.createdAt,
      TriggerLog: undefined,
      usedToday: trigger.TriggerLog.filter(
        (log) =>
          log.createdAt.getTime() <= todayDate.getTime() &&
          log.createdAt.getTime() >= yesterdayDate.getTime()
      ).length,
    }));
    const more_used_reactive = await prisma.trigger.findFirst({
      where: { userId: user.id },
      orderBy: { TriggerLog: { _count: "desc" } },
    });
    return mountApiResponse({
      reactives_today,
      overall_reactive,
      responses_today,
      all_reactives,
      more_used_reactive: more_used_reactive?.name ?? "Nenhum",
    });
  });
  fastify.get<{ Params: { id: string } }>(
    "/reactive/:id",
    async (req, reply) => {
      const reactiveId = req.params.id;
      const reactive = await prisma.trigger.findUnique({
        where: { id: Number(reactiveId) },
      });
      return reactive;
    }
  );
  fastify.delete<{ Params: { id: string } }>(
    "/reactive/:id",
    async (req, reply) => {
      const reactiveId = req.params.id;
      await prisma.trigger.delete({ where: { id: Number(reactiveId) } });
      return { message: "Reactive deleted" };
    }
  );
};

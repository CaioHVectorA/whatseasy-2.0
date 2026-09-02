import { prisma } from "@/lib/prisma.client";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { WhatsAppManager } from "@/lib/wpp/whatsapp.manager";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const userController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Retorna métricas consolidadas para o dashboard
  fastify.get("/user/dashboard", async (req, reply) => {
    const userId = (req.user as { id: string }).id;

    const session = WhatsAppManager.getSession(userId);
    const client = await prisma.client.findUnique({ where: { userId } });

    const isConnected = session ? session.status === "CONNECTED" : (client?.isConnected ?? false);
    const connectionStatus = session ? session.status : (client?.status ?? "DISCONNECTED");

    const [
      totalContacts,
      totalClusters,
      totalReactives,
      activeReactives,
      totalTriggers,
      activeTriggers,
      totalSentMessages,
      recentLogs,
      topReactives,
      clusters,
    ] = await Promise.all([
      prisma.contacts.count({ where: { userId } }),
      prisma.contactCluster.count({ where: { userId } }),
      prisma.trigger.count({ where: { userId, kind: "REACTIVE" } }),
      prisma.trigger.count({ where: { userId, kind: "REACTIVE", active: true } }),
      prisma.trigger.count({ where: { userId, kind: "SCHEDULED" } }),
      prisma.trigger.count({ where: { userId, kind: "SCHEDULED", active: true } }),
      prisma.sentMessages.count({ where: { userId } }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.trigger.findMany({
        where: { userId, kind: "REACTIVE" },
        orderBy: { usageCount: "desc" },
        take: 5,
        select: { id: true, name: true, usageCount: true, active: true },
      }),
      prisma.contactCluster.findMany({
        where: { userId },
        include: { _count: { select: { Contacts: true, ContactRelations: true } } },
        take: 6,
      }),
    ]);

    // Monta distribuição por cluster
    const clusterDistribution = clusters.map((c) => ({
      id: c.id,
      name: c.name,
      count: Math.max(c._count.Contacts, c._count.ContactRelations),
    }));

    // Simula / calcula agregação de atividade recente por horário (últimas 7 horas / dias)
    const now = new Date();
    const activityChart = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(now.getTime() - (6 - idx) * 3600 * 1000 * 4);
      const timeLabel = `${d.getHours().toString().padStart(2, "0")}:00`;
      return {
        time: timeLabel,
        mensagens: Math.floor(totalSentMessages / 7) + (idx % 3) * 2,
        automacoes: Math.floor((topReactives.reduce((a, b) => a + b.usageCount, 0)) / 7) + (idx % 2) * 3,
      };
    });

    return mountApiResponse({
      connection: {
        isConnected,
        status: connectionStatus,
        phone: client?.phone ?? null,
        name: client?.name ?? null,
        last_conn: client?.last_conn ?? null,
      },
      metrics: {
        totalContacts,
        totalClusters,
        totalReactives,
        activeReactives,
        totalTriggers,
        activeTriggers,
        totalSentMessages,
      },
      topReactives,
      clusterDistribution,
      activityChart,
      recentLogs,
    });
  });

  // Rota retrocompatível com initial-data
  fastify.get("/user/initial-data", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const session = WhatsAppManager.getSession(userId);

    const [contactsCount, triggersCount, sentCount] = await Promise.all([
      prisma.contacts.count({ where: { userId } }),
      prisma.trigger.count({ where: { userId } }),
      prisma.sentMessages.count({ where: { userId } }),
    ]);

    return mountApiResponse({
      currentMonth: {
        Contacts: contactsCount,
        Trigger: triggersCount,
        SentMessages: sentCount,
        Schedule: 0,
      },
      lastMonth: {
        Contacts: 0,
        Trigger: 0,
        SentMessages: 0,
        Schedule: 0,
      },
      clientSync: session ? session.status === "CONNECTED" : false,
    });
  });
};

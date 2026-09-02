import { prisma } from "@/lib/prisma.client";
import { mountApiResponse } from "@/lib/ws/mount-response";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const logsController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Lista logs com filtros e paginação
  fastify.get("/logs", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { eventType, status, limit = "50", page = "1", search } = req.query as {
      eventType?: string;
      status?: string;
      limit?: string;
      page?: string;
      search?: string;
    };

    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const whereClause: any = { userId };

    if (eventType && eventType !== "ALL") {
      whereClause.eventType = eventType;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search } },
        { contactName: { contains: search } },
        { contactPhone: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.activityLog.count({
        where: whereClause,
      }),
    ]);

    return mountApiResponse({
      logs,
      total,
      page: Number(page) || 1,
      totalPages: Math.ceil(total / take),
    });
  });

  // Limpar logs
  fastify.delete("/logs", async (req, reply) => {
    const userId = (req.user as { id: string }).id;

    await prisma.activityLog.deleteMany({
      where: { userId },
    });

    return mountApiResponse({}, "Logs limpos com sucesso!");
  });
};

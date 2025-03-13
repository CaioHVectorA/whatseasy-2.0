import { prisma } from '@/lib/prisma.client';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const messageController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/most-recent-messages', async (req, reply) => {
    const messages = await prisma.sentMessages.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
    });
    // todo add namer handling, maybe a relationship with contacts type (optional) or something else
    reply.send(
      messages.map((item) => ({
        ...item,
        // name: 'John Doe',
        name: item.message.length > 20 ? item.message.substring(0, 20) + '...' : item.message,
        avatarFallback: 'JD',
      }))
    );
  });
};

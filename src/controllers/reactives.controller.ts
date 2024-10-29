import { prisma } from "@/lib/prisma.client";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const reactiveController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.get('/reactives', async (req, reply) => {
        const user = req.me;
        const reactives = await prisma.reactive.findMany({
            where: {
                userId: user.id
            }
        });
        return reactives;
    });
    fastify.post('/reactive', async (req, reply) => {
        const user = req.me;
        // const { }
    })
}
import { prisma } from "@/lib/prisma.client";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

export const userController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // my fastify instance has a jwt plugin
    fastify.get('/user/me', async (req, reply) => {
        return req.me
    })
    // other routes using req.me..
}
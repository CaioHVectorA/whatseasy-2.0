import { prisma } from "@/lib/prisma.client";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

export const userController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // my fastify instance has a jwt plugin
    fastify.get('/user/me', async (req, reply) => {
        return req.me
    })
    fastify.get('/clients', async (req, reply) => {
        return req.clients.map((c) => c.clientUUid)
    })

    fastify.get('/user/initialData', async (req, reply) => {
        const user = await prisma.user.findUnique({
            where: {
                id: req.me.id
            },
            select: {
                _count: {
                    select: {
                        Contacts: true,
                        Reactive: true,
                        SentMessages: true,
                        Schedule: true
                    }
                }
            }
        })
        return user
    })
}
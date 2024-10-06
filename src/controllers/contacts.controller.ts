import { prisma } from "@/lib/prisma.client";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const contactsController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.get('/contacts', async (req, reply) => {
        const uuid = req.me.id
        const client = req.clients.find((c) => c.clientUUid === uuid)
        if (!client) {
            // return []
        }
        // const contacts = client.sock.ev.on
        fastify.log.info({ uuid })
        const data = await prisma.contacts.findMany({ where: { userId: uuid }, include: { Cluster: true } })
        return data
    })
}

import { prisma } from "@/lib/prisma.client";
import type { Client } from "@/lib/wpp/Client";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

export const userController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // my fastify instance has a jwt plugin
    fastify.get('/user/me', async (req, reply) => {
        return mountApiResponse(req.me)
    })
    fastify.get('/clients', async (req, reply) => {
        return mountApiResponse(req.clients.map((c) => c.clientUUid))
    })

    fastify.get('/user/initial-data', async (req, reply) => {
        const user = await prisma.user.findUnique({
            where: {
                id: req.me.id
            },
            select: {
                _count: {
                    select: {
                        Contacts: true,
                        Trigger: true,
                        SentMessages: true,
                        Schedule: true
                    }
                }
            }
        })
        const clientExists = req.clients.find((c: Client) => c.clientUUid === req.me.id)
        if (!clientExists) {
            return mountApiResponse({ ...user?._count, clientSync: false })
        }
        // check if client is sync
        try {
            //@ts-ignore
            const clientSync = !!(await clientExists.sock.sendMessage(clientExists.sock.user?.id, { text: 'Olá, mundo!' }))
            if (!clientSync) {

            }
            return mountApiResponse({ ...user?._count, clientSync })
        } catch (err) {
            console.log('DEU MERDA!!!!!!!!', err)
            return mountApiResponse({ ...user?._count, clientSync: false }, 'Erro ao sincronizar com o cliente', 'Erro ao sincronizar com o cliente')
        }
    })
}
import { prisma } from "@/lib/prisma.client";
import type { Body } from "@/lib/types/utils";
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
        // const data = await prisma.contacts.findMany({ where: { userId: uuid }, include: { Cluster: true } })
        const data = await prisma.contactCluster.findMany({ where: { userId: uuid }, include: { Contacts: true } })
        const formattedData = data.map((cluster) => { return { ...cluster, contacts: cluster.Contacts } })
        const contactsWithoutCluster = await prisma.contacts.findMany({ where: { userId: uuid, clusterId: null } })
        return [...(formattedData.toReversed()), { name: "Sem grupo", contacts: contactsWithoutCluster, description: 'Contatos sem grupo' }]
    });
    fastify.post<Body<{ name: string, description: string }>>('/cluster', async (req, reply) => {
        const uuid = req.me.id
        const client = req.clients.find((c) => c.clientUUid === uuid)
        if (!client) {
            // return []
        }
        const { name, description } = req.body
        const alreadyExists = await prisma.contactCluster.findFirst({ where: { name, userId: uuid } })
        if (alreadyExists) {
            return reply.status(400).send("Grupo já existe!")
        }
        const data = await prisma.contactCluster.create({
            data: {
                name,
                description,
                userId: uuid
            }
        })
        return data
    })
    fastify.post<Body<{ name: string, phone: string, email: string, clusterId?: number }>>('/contact', async (req, reply) => {
        const uuid = req.me.id
        const client = req.clients.find((c) => c.clientUUid === uuid)
        if (!client) {
            // return []
        }
        const { name, phone, email, clusterId } = req.body
        const data = await prisma.contacts.create({
            data: {
                name,
                phone,
                userId: uuid,
                clusterId
            }
        })
        return data
    })
    fastify.patch<Body<{ contactIds: number[], clusterId: number }>>('/move-contacts', async (req, reply) => {
        const uuid = req.me.id
        const { contactIds, clusterId } = req.body
        const data = await prisma.contacts.updateMany({
            where: {
                id: {
                    in: contactIds
                },
                userId: uuid
            },
            data: {
                clusterId
            }
        })
        return "Movido com sucesso!"
    })
    fastify.delete<Body<{ contactsId: number[] }>>('/contacts', async (req, reply) => {
        const uuid = req.me.id
        const { contactsId } = req.body
        const d = await prisma.contacts.deleteMany({
            where: {
                id: {
                    in: contactsId
                },
                userId: uuid
            }
        })
        console.log({d})
        return "Deletado com sucesso!"
    })
    fastify.post<
        Body<{ contactIds: number[], message: string }>
    >('/contacts/send-message', async (req, reply) => {
        const uuid = req.me.id
        const client = req.clients.find((c) => c.clientUUid === uuid)
        if (!client) {
            // return []
        }
        const { contactIds, message } = req.body
        fastify.log.info({ contactIds, message })
        return { contactIds, message }
    })
}

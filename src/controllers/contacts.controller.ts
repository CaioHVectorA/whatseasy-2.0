import { prisma } from "@/lib/prisma.client";
import type { Body } from "@/lib/types/utils";
import { mountApiResponse } from "@/lib/ws/mount-response";
import type { Contacts } from "@prisma/client";
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
            return reply.status(400).send(mountApiResponse({}, 'Grupo já existe!', 'Grupo já existe!'))
        }
        const data = await prisma.contactCluster.create({
            data: {
                name,
                description,
                userId: uuid
            }
        })
        return mountApiResponse(data, 'Grupo criado com sucesso!', 'Grupo criado com sucesso!')
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
        return mountApiResponse({}, 'Contato criado com sucesso!', 'Contato criado com sucesso!')
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
        return mountApiResponse({}, 'Contatos movidos com sucesso!', 'Contatos movidos com sucesso!')
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
        return mountApiResponse({}, 'Contatos deletados com sucesso!', 'Contatos deletados com sucesso!')
    })
    fastify.post<
        Body<{ contactIds: Contacts[], message: string }>
    >('/contacts/send-message', async (req, reply) => {
        const uuid = req.me.id
        const client = req.clients.find((c) => c.clientUUid === uuid)
        if (!client) {
            // return []
            return reply.status(400).send("Usuário não encontrado!")
        }
        const { contactIds, message } = req.body
        const promises = []
        for (const id of contactIds) {
            const jid = client.sock.decodeJid(id.phone)
            console.log({ jid })
            const pr = client.sock.sendMessage(jid, { text: message })
            promises.push(pr)
        }
        const contacts = await Promise.allSettled(promises)
        const allSuccess = contacts.every((c) => c.status === 'fulfilled')
        const allError = contacts.every((c) => c.status === 'rejected')
        if (allSuccess) return mountApiResponse({}, 'Mensagens enviadas com sucesso!', 'Mensagens enviadas com sucesso!')
        if (allError) return mountApiResponse({}, 'Erro ao enviar mensagens!', 'Erro ao enviar mensagens!')
        return mountApiResponse({}, 'A maioria das mensagens!', 'A maioria das mensagens!')
    })
}

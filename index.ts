import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { main } from './src/lib/ws'
import jwt, { } from '@fastify/jwt'
import { userController } from '@/controllers/user.controller'
import { authController } from '@/controllers/auth.controller'
import { AppError } from '@/lib/appError'
import { prisma } from '@/lib/prisma.client'
import cors from '@fastify/cors'
import { createClient, type Client } from '@/lib/wpp/Client'
import { fstat, readdirSync, readSync } from 'fs'
import type { User } from '@prisma/client'
import { contactsController } from '@/controllers/contacts.controller'
import { reactiveController } from '@/controllers/reactives.controller'
import { connect } from '@/lib/wpp/connect'
const fastify = Fastify({
    logger: false
})
declare module 'fastify' {
    interface FastifyRequest {
        me: { id: string, email: string, name: string, last_connection: Date, isConnected: boolean };
        clients: Client[];
    }
}
await fastify.register(cors, {
    // put your options here
    credentials: true,
    origin: '*',
})
const clients: Client[] = [];

fastify.register(websocket)
fastify.register(jwt, { secret: process.env.JWT_SECRET || "secret" })
// fastify.decorateRequest('clients', [])
// fastify.addHook('preHandler', (request, reply, done) => {
//     request.clients = clients
//     done()
// })
fastify.decorateRequest('clients', { getter: () => clients })
fastify.register(authController)
fastify.setErrorHandler(async (error, request, reply) => {
    if (error instanceof AppError) {
        reply.status(error.statusCode).send({
            status: error.statusCode,
            message: error.message,
            isOperational: true,
            // stack: error.stack
        })
    }
    reply.status(error.statusCode || 500).send({ ...error, isOperational: false })
})

fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        socket.on('connection', () => console.log('Client connected.'))
        socket.on('message', main(socket, clients))
        // socket.on('')
    })
})
fastify.addHook("onRequest", async (request, reply) => {
    if (request.ws) return
    if (request.url.startsWith('/auth')) return
    try {
        await request.jwtVerify()
    } catch (err) {
        reply.send(err)
    }
})
fastify.addHook("onRequest", async (request, reply) => {
    if (request.ws || request.url.startsWith('/auth')) return
    try {
        // Supondo que request.user seja um JWT string
        const user = request.user as { id: string };
        // Busca o usuário pelo ID do JWT
        //@ts-ignore
        request.me = (await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, email: true, name: true, Client: { select: { isConnected: true, last_conn: true } } }
        }));

        // Se o usuário não for encontrado, retorna erro
        if (!request.me) {
            return reply.status(404).send({ error: "Usuário não encontrado!" });
        }
    } catch (err) {
        console.log({ err })
        // Se der erro, retorna erro 500
        return reply.status(500).send({ error: "Erro encontrando usuário!" });
    }
})
fastify.register(userController)
fastify.register(contactsController)
fastify.register(reactiveController)
fastify.listen({
    port: 3333,
}).then(() => {
    console.log('Server running at http://localhost:3333')
})
// if (process.env.NODE_ENV) {
//     readdirSync('auths').forEach((uuid) => createClient(uuid, clients))
// }
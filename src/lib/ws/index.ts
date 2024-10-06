import { type WebSocket } from '@fastify/websocket'
import { ClientSignals, ServerSignals, type WebSocketRequest } from './signals'
import { createClient, type Client } from '../wpp/Client'
import { handleConnectionSockClosure } from '../wpp/handleConection'
import { connect } from '../wpp/connect'
import type { RawData } from 'ws'
import { handleContacts } from '../wpp/handleContacts'
// const clients: Client[] = []
export function main(socket: WebSocket, clients: Client[]) {
    return async (data: RawData) => {
        // console.log(data)
        // socket.on('ping',)
        const request = JSON.parse(data.toString()) as WebSocketRequest
        console.log({ request })
        if (request.event !== ServerSignals.NEW_CLIENT) return
            const client = await createClient(request.uuid, clients)
            console.log('Cliente criado!')
            socket.send(JSON.stringify({ event: ClientSignals.CLIENT_UPDATE, message: "Seu cliente foi criado! Seu qrcode será enviado em breve", clientUUid: client.clientUUid }))
            client.sock.ev.on('connection.update', handleConnectionSockClosure(client.sock, socket, connect, client.clientUUid))
            //@ts-ignore
            client.sock.ev.on('contacts.upsert', () => console.log('contacts.upsert'))
            //@ts-ignore
            client.sock.ev.on('contacts.update', handleContacts(client.sock, socket, connect, client.clientUUid))
    }
}


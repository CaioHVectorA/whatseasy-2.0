import { type WebSocket } from '@fastify/websocket'
import { ClientSignals, ServerSignals, type WebSocketRequest } from './signals'
import { createClient } from '../wpp/Client'
import { handleConnectionSockClosure } from '../wpp/handleConection'
import { connect } from '../wpp/connect'
import type { RawData } from 'ws'
export function main(socket: WebSocket) {
    return async (data: RawData) => {
        // console.log(data)
        // socket.on('ping',)
        const request = JSON.parse(data.toString()) as WebSocketRequest
        console.log({ request })
        if (request.event !== ServerSignals.NEW_CLIENT) return
            const client = await createClient()
            socket.send(JSON.stringify({ event: ClientSignals.CLIENT_UPDATE, message: "Seu cliente foi criado! Seu qrcode será enviado em breve", clientUUid: client.clientUUid }))
            client.sock.ev.on('connection.update', handleConnectionSockClosure(client.sock, socket, connect, client.clientUUid))
    }
}
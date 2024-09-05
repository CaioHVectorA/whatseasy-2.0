import { type WebSocket } from '@fastify/websocket'
import { ClientSignals } from './signals'
import { createClient } from '../wpp/Client'
import type { RawData } from 'ws'
import { handleConnectionSockClosure } from '../wpp/handleConection'
export function main(socket: WebSocket) {
    return async (data: RawData) => {
        // console.log(data)
        socket.send(data.toString())
        // socket.on('ping',)
        if (data.toString() !== 'new-client') return
            const client = await createClient()
            socket.send(JSON.stringify({ event: ClientSignals.CLIENT_UPDATE, message: "Seu cliente foi criado! Seu qrcode será enviado em breve", clientUUid: client.clientUUid }))
            client.sock.ev.on('connection.update', handleConnectionSockClosure(client.sock, socket))
    }
}
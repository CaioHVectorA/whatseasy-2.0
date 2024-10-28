import { DisconnectReason, type ConnectionState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from 'qrcode'
import type { ModifiedSock } from "../types/modified.sock.type";
import type { WebSocket } from "@fastify/websocket";
import { mountResponse } from "../ws/mount-response";
import { ClientSignals } from "../ws/signals";
import { prisma } from "../prisma.client";
export async function handleConnection(state: Partial<ConnectionState>) {
    const { connection, lastDisconnect, qr } = state;
    if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const reconnect = [DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut].includes(statusCode);
        
        console.log(`Connection closed due to ${DisconnectReason[statusCode]}${reconnect ? ', reconnecting...' : ''}`);
        
        if (reconnect) return handleConnection(state);
        return process.exit();
      } 
      //@ts-ignore
      if (qr) console.log(await qrcode.toDataURL(qr));
      if (connection === "open") {
        console.log('Connection open!')
      }
}

export const handleConnectionSockClosure = (sock: ModifiedSock, websocket: WebSocket, fallback: (uuid: string) => any, uuid: string) => {
  return async (state: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr, isNewLogin } = state;
    console.log(`Chegou aqui`)
    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const reconnect = [DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut].includes(statusCode);
      console.log(`Connection closed due to ${DisconnectReason[statusCode]}${reconnect ? ', reconnecting...' : ''}`);
      await prisma.user.update({ where: { id: uuid }, data: { isConnected: false } })
      if (reconnect) {
        console.log('Chegou aqui reconnect')
        websocket.send(mountResponse(ClientSignals.CLIENT_SUCESS, 'Sua conexão será estabelecida em alguns segundos!', sock.clientUuid))
        return fallback(uuid)
      };
      if (isNewLogin) {
        console.log('Chegou aqui isNewLogin')
        return fallback(uuid)
      }
      websocket.send(mountResponse(ClientSignals.CLIENT_FAIL, 'Conexão encerrada! Tente novamente.', sock.clientUuid))
      return process.exit();
    } 
    if (qr) {
      sock.qr = await qrcode.toDataURL(qr)
      return websocket.send(mountResponse(ClientSignals.QR, 'QR Code gerado com sucesso!', sock.clientUuid, sock.qr))
    };
    
    if (connection === "open") {
      console.log('Connection open!')
      await prisma.user.update({ where: { id: uuid }, data: { last_connection: new Date(), isConnected: true } })
      return websocket.send(mountResponse(ClientSignals.CLIENT_SUCESS, 'Conexão estabelecida com sucesso!', sock.clientUuid))
    }
    console.log('Chegou até aqui!!')
  }
}
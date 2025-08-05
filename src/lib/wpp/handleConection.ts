import { DisconnectReason, type ConnectionState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs/promises';
import qrcode from 'qrcode';
import type { ModifiedSock } from '../types/modified.sock.type';
import type { WebSocket } from '@fastify/websocket';
import { mountResponse } from '../ws/mount-response';
import { ClientSignals } from '../ws/signals';
import { prisma } from '../prisma.client';
import { AUTH_FOLDER } from '@/helpers/consts';
export async function handleConnection(state: Partial<ConnectionState>) {
  const { connection, lastDisconnect, qr } = state;
  if (connection === 'close') {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    const reconnect = [
      DisconnectReason.connectionClosed,
      DisconnectReason.connectionLost,
      DisconnectReason.restartRequired,
      DisconnectReason.timedOut,
      DisconnectReason.loggedOut,
    ].includes(statusCode);

    console.log(`Connection closed due to ${DisconnectReason[statusCode]}${reconnect ? ', reconnecting...' : ' restarting'}`);

    if (reconnect) return handleConnection(state);
    return process.exit();
  }
  //@ts-ignore
  if (qr) console.log(await qrcode.toDataURL(qr));
  if (connection === 'open') {
    console.log('Connection open!');
  }
}

export const handleConnectionSockClosure = (sock: ModifiedSock, websocket: WebSocket, fallback: (uuid: string) => any, uuid: string) => {
  return async (state: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr, isNewLogin } = state;
    console.log(`Chegou aqui`);
    console.log({ sock: sock.clientUuid, uuid });
    let clientExists = await prisma.client.findFirst({ where: { userId: sock.clientUuid || uuid } });
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const reconnect = [
        DisconnectReason.connectionClosed,
        DisconnectReason.connectionLost,
        DisconnectReason.restartRequired,
        DisconnectReason.timedOut,
      ].includes(statusCode);
      console.log(`Connection closed due to ${DisconnectReason[statusCode]}${reconnect ? ', reconnecting...' : ''}`);
      let clientExists = await prisma.client.findFirst({ where: { userId: sock.clientUuid || uuid } });
      if (clientExists) {
        clientExists = await prisma.client.update({ where: { id: clientExists.id }, data: { isConnected: false } });
      } else {
        clientExists = await prisma.client.create({ data: { userId: uuid || sock.clientUuid, isConnected: false, qr: qr ?? '' } });
      }
      await prisma.clientLog.create({ data: { clientId: clientExists.id, type: 'DISCONNECT' } });

      if (reconnect) {
        console.log('Chegou aqui reconnect');
        websocket.send(mountResponse(ClientSignals.CLIENT_SUCESS, 'Sua conexão será estabelecida em alguns segundos!', sock.clientUuid));
        return fallback(uuid);
      }
      if (isNewLogin) {
        console.log('Chegou aqui isNewLogin');
        return fallback(uuid);
      }
      websocket.send(mountResponse(ClientSignals.CLIENT_FAIL, 'Conexão encerrada! Tente novamente.', sock.clientUuid));
      const folderExists = await fs
        .access(process.cwd() + '/auths/' + uuid)
        .then(() => true)
        .catch(() => false);
      if (folderExists) {
        await prisma.client.update({ where: { userId: uuid }, data: { isConnected: false } });
        await fs.rm(process.cwd() + '/auths/' + uuid, { recursive: true });
        return handleConnectionSockClosure(sock, websocket, fallback, uuid);
      }
      return process.exit();
    }
    if (qr) {
      sock.qr = await qrcode.toDataURL(qr);
      return websocket.send(mountResponse(ClientSignals.QR, 'QR Code gerado com sucesso!', sock.clientUuid, sock.qr));
    }

    if (connection === 'open') {
      console.log('Connection open!');
      console.log({ clientExists, uuid });
      // await prisma.user.update({ where: { id: uuid }, data: { last_connection: new Date(), isConnected: true } })
      if (clientExists) {
        clientExists = await prisma.client.update({ where: { id: clientExists.id }, data: { isConnected: true, last_conn: new Date() } });
      } else {
        clientExists = await prisma.client.create({ data: { userId: uuid, qr: qr ?? '', last_conn: new Date(), isConnected: true } });
      }
      await prisma.clientLog.create({ data: { clientId: clientExists.id, type: 'CONNECT' } });
      return websocket.send(mountResponse(ClientSignals.CLIENT_SUCESS, 'Conexão estabelecida com sucesso!', sock.clientUuid));
    }
    console.log('Chegou até aqui!!');
  };
};

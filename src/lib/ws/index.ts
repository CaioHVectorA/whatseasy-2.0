import { type WebSocket } from '@fastify/websocket';
import { ClientSignals, ServerSignals, type WebSocketRequest } from './signals';
import { createClient, type Client } from '../wpp/Client';
import { handleConnectionSockClosure } from '../wpp/handleConection';
import { connect } from '../wpp/connect';
import type { RawData } from 'ws';
import { handleContacts } from '../wpp/handleContacts';
import { handleMessages } from '../wpp/handleMessage';
import { prisma } from '../prisma.client';
import { mountResponse } from './mount-response';
// const clients: Client[] = []
export function main(socket: WebSocket, clients: Client[]) {
  return async (data: RawData) => {
    // console.log(data)
    // socket.on('ping',)
    const request = JSON.parse(data.toString()) as WebSocketRequest;
    console.log(request.event);

    if (request.event === ServerSignals.GET_CLIENT) {
      const client = await prisma.client.findFirst({
        where: { userId: request.uuid },
        // include: {
        //   User: true,
        //   clientLog: true,
        // },
        select: {
          id: true,
          isConnected: true,
          last_sync: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      const lastLog = await prisma.clientLog.findFirst({
        where: { clientId: client?.id, type: 'SYNC' },
        orderBy: { createdAt: 'desc' },
      });
      const isLastLogIn1Minute = lastLog?.createdAt ? lastLog?.createdAt > new Date(Date.now() - 60000) : false;
      if (client?.isConnected && !isLastLogIn1Minute) {
        await prisma.client.update({ where: { id: client?.id }, data: { last_sync: new Date() } });
        await prisma.clientLog.create({ data: { clientId: client?.id, type: 'SYNC' } });
      }
      socket.send(
        JSON.stringify({
          event: ClientSignals.CLIENT_UPDATE,
          message: 'Status do cliente atualizado',
          clientUUid: request.uuid,
          data: {
            isConnected: client?.isConnected || false,
          },
          send_date: new Date().toISOString(),
        })
      );
      return;
    }

    if (request.event !== ServerSignals.NEW_CLIENT) return;
    const client = await createClient(request.uuid, clients);
    console.log('Cliente criado!');
    socket.send(
      JSON.stringify({
        event: ClientSignals.CLIENT_UPDATE,
        message: 'Seu cliente foi criado! Seu qrcode será enviado em breve',
        clientUUid: client.clientUUid,
      })
    );
    client.sock.ev.on('connection.update', handleConnectionSockClosure(client.sock, socket, connect, client.clientUUid));
    // client.sock.ev.on('contacts.upsert', () => console.log('contacts.upsert'))
    client.sock.ev.on('contacts.update', handleContacts(client.sock, socket as any, connect, client.clientUUid));

    client.sock.ev.on('messages.upsert', handleMessages(client.sock, socket as any, connect, client.clientUUid));
  };
}

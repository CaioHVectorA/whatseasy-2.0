import type makeWASocket from "@whiskeysockets/baileys";

export type ModifiedSock = (ReturnType<typeof makeWASocket> & { decodeJid: (jid: string) => any, qr: string, clientUuid: string });

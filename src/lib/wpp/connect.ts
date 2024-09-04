import { makeWASocket, DisconnectReason, Browsers, useMultiFileAuthState, jidDecode } from "@whiskeysockets/baileys";
import qrcode from 'qrcode'
import { Boom } from "@hapi/boom";
import pino, { type Logger } from "pino";
import { handleConnection, handleConnectionSockClosure } from "./handleConection";
import { decodeJid } from "./decodeJid";
import type { ModifiedSock } from "../types/modified.sock.type";

const INCLUDED_CHATS = ['5521986723607@s.whatsapp.net'];
export async function connect(uuid: string): Promise<ModifiedSock> {
  const initDate = Date.now() / 1000;
  const { state, saveCreds } = await useMultiFileAuthState(`/auths/${uuid}`);
  const sock = (makeWASocket({
    browser: Browsers.macOS('Desktop'),
    auth: state,
    logger: (pino({ level: 'silent' }) as any),
  })) as ModifiedSock;
  //@ts-ignore
  sock.decodeJid = decodeJid;
  sock.ev.on("creds.update", saveCreds);
  //@ts-ignore
  return sock;
}
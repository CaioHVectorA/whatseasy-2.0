import makeWASocket, { getChatId } from "@whiskeysockets/baileys";
import { connect } from "./connect";
import { INCLUDED_CHATS } from "../../helpers/consts";
import type { ModifiedSock } from "../types/modified.sock.type";
type Client = {
    sock: ModifiedSock;
    clientUUid: string,
    init: number,
    connected: boolean,
}

export async function createClient(): Promise<Client> {
    const clientUUid = crypto.randomUUID()
    const init = Date.now();
    const sock = await connect(clientUUid);
    sock.ev.on('messages.upsert', async (m) => {
        if (m.messages[0].message?.conversation === "Olá, mundo!" || !INCLUDED_CHATS.includes(getChatId({ ...m.messages[0].key })) ) return;
        //@ts-ignore
        if ((m.messages[0].messageTimestamp) < initDate) return;
        if (m.messages[0].message?.conversation === '') return  (m.messages[0].messageTimestamp, init)
        console.log("Responderia!!!")
        // return;  
        const response = 'Olá, mundo!';
        if (!m.messages[0].key.remoteJid) return;
        await sock.sendMessage(m.messages[0].key.remoteJid, {
          text: response,
        });
    });
    return {
        sock,
        clientUUid,
        init,
        connected: false,
    };
}
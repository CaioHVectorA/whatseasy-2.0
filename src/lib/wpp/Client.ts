import makeWASocket, { getChatId } from "@whiskeysockets/baileys";
import { connect } from "./connect";
import { INCLUDED_CHATS } from "../../helpers/consts";
import type { ModifiedSock } from "../types/modified.sock.type";
export type Client = {
    sock: ModifiedSock;
    clientUUid: string,
    init: number,
    connected: boolean,
}
// PERSIST!!
export async function createClient(uuid: string, clients: Client[]): Promise<Client> {
    const inMemoClient = clients.find((c) => c.clientUUid === uuid);
    if (inMemoClient) {
        return inMemoClient
    };
    const init = Date.now();
    const sock = await connect(uuid);
    // sock.ev.on('messages.upsert', async (m) => {
    //     console.log("msg!!!")
    //     if (m.messages[0].message?.conversation === "Olá, mundo!" || !INCLUDED_CHATS.includes(getChatId({ ...m.messages[0].key }))) return;
    //     // if ((m.messages[0].messageTimestamp) < initDate) return;
    //     if (m.messages[0].message?.conversation === '') return (m.messages[0].messageTimestamp, init)
    //     console.log("Responderia!!!")
    //     // return;  
    //     const response = 'Olá, mundo!';
    //     if (!m.messages[0].key.remoteJid) return;
    //     await sock.sendMessage(m.messages[0].key.remoteJid, {
    //         text: response,
    //     });
    // });
    const client = {
        sock,
        clientUUid: uuid,
        init,
        connected: true,
    } satisfies Client;
    clients.push(client);
    return client;
}


import { getChatId, type MessageUpsertType, type WAMessage } from "@whiskeysockets/baileys";
import type { ModifiedSock } from "../types/modified.sock.type";
import { INCLUDED_CHATS } from "@/helpers/consts";
import { prisma } from "../prisma.client";
import type { Trigger } from "@prisma/client";
import { textTriggerTest } from "../trigger/text-trigger";

export function handleMessages(sock: ModifiedSock, websocket: WebSocket, fallback: (uuid: string) => any, uuid: string) {
    return async (m: {
        messages: WAMessage[];
        type: MessageUpsertType;
        requestId?: string;
    }) => {
        console.log("msg!!!")
        if (m.messages[0].message?.conversation === "Olá, mundo!" || !INCLUDED_CHATS.includes(getChatId({ ...m.messages[0].key }))) return;
        // if ((m.messages[0].messageTimestamp) < initDate) return;
        if (m.messages[0].message?.conversation === '') return (m.messages[0].messageTimestamp, Date.now())
        console.log("Responderia!!!")
        // return;  
        // const response = 'Olá, mundo!';
        if (!m.messages[0].key.remoteJid) return;
        const triggers = await prisma.trigger.findMany({
            where: { userId: uuid },
            select: {
                TextTrigger: true,
                TriggerClusterRelation: { include: { TriggerCluster: true } },
                ResponseTriggerRelation: { include: { Response: true } }
            }
        })
        let filtered = [] as typeof triggers
        father: for (const trigger of triggers) {
            if (trigger.TextTrigger.length > 0) {
                for (const { triggerId, triggerClusterId, TriggerCluster } of trigger.TriggerClusterRelation) {
                    // implement cluster logic
                }
                // implement temporal condition logic
                for (const textTrigger of trigger.TextTrigger) {
                    // "EQUALS", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX")
                    const passedTextTrigger = textTriggerTest(textTrigger.type as any, textTrigger.text, m.messages[0].message?.conversation as string)
                    if (!passedTextTrigger) continue father;
                }
            }
            filtered.push(trigger)
        }
        if (filtered.length === 0) return;
        const responses = filtered[0]
        await prisma.triggerLog.create({ data: { triggerId: responses.ResponseTriggerRelation[0].triggerId } })
        for (const response of responses.ResponseTriggerRelation) {
            await sock.sendMessage(m.messages[0].key.remoteJid, {
                text: response.Response.content,
            });
            await prisma.responseLog.create({ data: { responseId: response.responseId } })
        }
    }
}
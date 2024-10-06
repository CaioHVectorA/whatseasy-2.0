import type { Contact } from "@whiskeysockets/baileys";
import type { ModifiedSock } from "../types/modified.sock.type";
import { writeFile, readFile } from 'fs/promises'
import { prisma } from "../prisma.client";
export function handleContacts(sock: ModifiedSock, websocket: WebSocket, fallback: (uuid: string) => any, uuid: string) {
    return async (arg: Partial<Contact>[]) => {
        if (!arg) return
        const final = [] as Partial<Contact>[]
        let file = [] as Partial<Contact>[];
        // try {
        //     file = JSON.parse((await readFile(`./data/${uuid}.json`, { encoding: 'utf-8' }))) as Partial<Contact>[]
        // } catch (err) {}
        // file.forEach(contact => {
        //     const index = arg.includes(contact)
        //     if (!index) {
        //         final.push(contact)
        //     }
        // })
        arg.forEach(contact => {
            const index = file.includes(contact)
            if (!index) {
                final.push(contact)
            }
        })
        console.log({ final })
        // await writeFile(`./data/${uuid}.json`, JSON.stringify(final))
        for (const item of final) {
            console.log({ item })
            const exists = await prisma.contacts.findFirst({ where: { name: item.notify, userId: uuid } })
            console.log(exists)
            if (exists) continue
            console.log({ exists, item })
            if (!item.notify || !item.id) continue
            const created = await prisma.contacts.create({ data: { 
                phone: item.id,
                name: item.notify,
                userId: uuid,
             } })
             console.log({created})
        }
    }
}
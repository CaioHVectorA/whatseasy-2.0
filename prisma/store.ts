import { PrismaClient } from "@prisma/client"
import fs from 'fs/promises'
const prisma = new PrismaClient()

export async function storeToJson() {
    const contacts = await prisma.contacts.findMany()
    const clusters = await prisma.contactCluster.findMany()
    const data = { contacts, clusters }
    await fs.writeFile(process.cwd() + '/prisma/data.json', JSON.stringify(data))
}

storeToJson()
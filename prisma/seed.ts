import { PrismaClient, type ContactCluster, type Contacts } from '@prisma/client';
const prisma = new PrismaClient();
import { genSalt, hash, compare } from 'bcrypt';
import fs from 'fs/promises'
async function seed() {
    const user = await prisma.user.create({
        data: {
            email: 'Admin@gm.co',
            password: await hash('Teste', await genSalt(10)),
            name: 'Admin',
        }
    })
    const contacts = JSON.parse(await fs.readFile(process.cwd() + '/prisma/data.json', { encoding: 'utf-8' })) as { contacts: Contacts[], clusters: ContactCluster[] }
    await prisma.contactCluster.createMany({
        data: contacts.clusters
    })
    await prisma.contacts.createMany({
        data: contacts.contacts
    })
}

seed();
import { PrismaClient, type ContactCluster, type Contacts } from '@prisma/client';
const prisma = new PrismaClient();
import { genSalt, hash, compare } from 'bcrypt';
import fs from 'fs/promises';
import { data } from './data';
const USER_ID = '2815e454-be3c-4812-aa91-808d66883cd6';
async function seed() {
  const contacts = JSON.parse(
    await fs.readFile(process.cwd() + '/prisma/data.json', {
      encoding: 'utf-8',
    })
  ) as { contacts: Contacts[]; clusters: ContactCluster[] };
  await prisma.contactCluster.deleteMany({
    where: { userId: USER_ID },
  });
  await prisma.contacts.deleteMany({
    where: { userId: USER_ID },
  });
  await prisma.contactCluster.createMany({
    data: contacts.clusters.map((cluster) => ({ ...cluster, userId: USER_ID, createdAt: new Date(), updatedAt: new Date() })),
  });
  await prisma.contacts.createMany({
    data: contacts.contacts.map((contact) => ({ ...contact, userId: USER_ID, createdAt: new Date(), updatedAt: new Date() })),
  });
}

seed();

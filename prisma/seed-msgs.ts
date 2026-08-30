import { prisma } from '@/lib/prisma.client';
import { data } from './data';
const USER_ID = '2815e454-be3c-4812-aa91-808d66883cd6';

async function SeedMessages() {
  const contacts = await prisma.contacts.findMany({
    where: { userId: USER_ID },
  });
  for (const contact of contacts) {
    const message = data.messages[Math.floor(Math.random() * data.messages.length)];
    const numberToSendMessages = Math.floor(Math.random() * 200);
    for (let i = 0; i < numberToSendMessages; i++) {
      const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
      const date = (() => {
        const now = new Date();
        const randomDays = Math.floor(Math.random() * 7);
        const randomHours = Math.floor(Math.random() * 24);
        const randomMinutes = Math.floor(Math.random() * 60);
        now.setDate(now.getDate() - randomDays);
        now.setHours(now.getHours() - randomHours);
        now.setMinutes(now.getMinutes() - randomMinutes);
        return now;
      })();
      await prisma.sentMessages.create({
        data: {
          phone: randomContact.phone,
          message,
          userId: USER_ID,
          createdAt: date,
          updatedAt: date,
        },
      });
    }
  }
}
SeedMessages();

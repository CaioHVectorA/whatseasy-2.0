import { prisma } from '@/lib/prisma.client';
import { data } from './data';
const USER_ID = '2815e454-be3c-4812-aa91-808d66883cd6';

async function hydrateMsgs() {
  console.log('Starting message hydration process...');

  // Get all contacts for the user
  const contacts = await prisma.contacts.findMany({
    where: { userId: USER_ID },
  });

  if (contacts.length === 0) {
    console.log('No contacts found. Please seed contacts first.');
    return;
  }

  console.log(`Found ${contacts.length} contacts. Starting message simulation...`);

  // Function to send a random message
  const sendRandomMessage = async () => {
    // Pick a random contact
    const randomContact = contacts[Math.floor(Math.random() * contacts.length)];

    // Pick a random message
    const message = data.messages[Math.floor(Math.random() * data.messages.length)];

    // Create the message with current timestamp
    await prisma.sentMessages.create({
      data: {
        phone: randomContact.phone,
        message,
        userId: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`Message sent to ${randomContact.name}: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);

    // Schedule next message with random delay
    const nextDelay = Math.floor(Math.random() * 3500) + 500; // Random delay between 0,5-3,5 seconds
    console.log(`Next message in ${nextDelay / 1000} seconds...`);
    setTimeout(sendRandomMessage, nextDelay);
  };

  // Start the message simulation with initial delay
  const initialDelay = 2000; // 2 second initial delay
  console.log(`Sending first message in ${initialDelay / 1000} seconds...`);
  setTimeout(sendRandomMessage, initialDelay);
}

// Run the hydration process
hydrateMsgs().catch((error) => {
  console.error('Error in message hydration:', error);
  process.exit(1);
});

// Keep the script running
process.stdin.resume();
console.log('Press Ctrl+C to stop the message simulation');

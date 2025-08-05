import { prisma } from '@/lib/prisma.client';
import type { Body } from '@/lib/types/utils';
import type { Client } from '@/lib/wpp/Client';
import { mountApiResponse } from '@/lib/ws/mount-response';
import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';

export const userController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // my fastify instance has a jwt plugin
  fastify.get('/user/me', async (req, reply) => {
    return mountApiResponse(req.me);
  });
  fastify.get('/clients', async (req, reply) => {
    return mountApiResponse(req.clients.map((c) => c.clientUUid));
  });
  fastify.patch<Body<{ name: string }>>('/user/name', async (req, reply) => {
    const { name } = req.body;
    const userAlreadyHasName = await prisma.user.findFirst({
      where: {
        id: req.me.id,
      },
    });
    if (userAlreadyHasName?.name) {
      return mountApiResponse({}, 'Você já escolheu um nome', 'Você já escolheu um nome');
    }
    const user = await prisma.user.update({
      where: {
        id: req.me.id,
      },
      data: {
        name,
      },
    });
    return mountApiResponse(user);
  });
  fastify.get<{
    Querystring: {
      month: string;
    };
  }>('/user/initial-data', async (req, reply) => {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(currentMonth.getMonth() - 1);
    const isMonth = req.query.month === 'true';
    const currentMonthData = await prisma.user.findUnique({
      where: {
        id: req.me.id,
      },
      select: {
        Contacts: {
          where: {
            createdAt: {
              gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
        Trigger: {
          where: {
            createdAt: {
              gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
        SentMessages: {
          where: {
            createdAt: {
              gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
        Schedule: {
          where: {
            createdAt: {
              gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
      },
    });

    const lastMonthData = await prisma.user.findUnique({
      where: {
        id: req.me.id,
      },
      select: {
        Contacts: {
          where: {
            createdAt: {
              gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
              lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
        Trigger: {
          where: {
            createdAt: {
              gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
              lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
        SentMessages: {
          where: {
            createdAt: {
              gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
              lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
        Schedule: {
          where: {
            createdAt: {
              gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
              lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            },
          },
        },
      },
    });
    const clientExists = req.clients.find((c: Client) => c.clientUUid === req.me.id);
    if (!currentMonthData || !lastMonthData) {
      return mountApiResponse({}, 'Erro ao buscar dados', 'Erro ao buscar dados');
    }
    const counts = {
      currentMonth: {
        Contacts: currentMonthData.Contacts.length,
        Trigger: currentMonthData.Trigger.length,
        SentMessages: currentMonthData.SentMessages.length,
        Schedule: currentMonthData.Schedule.length,
      },
      lastMonth: {
        Contacts: lastMonthData.Contacts.length,
        Trigger: lastMonthData.Trigger.length,
        SentMessages: lastMonthData.SentMessages.length,
        Schedule: lastMonthData.Schedule.length,
      },
    };

    const result = [];
    // Query usando Prisma
    const range = isMonth ? 30 : 7;
    for (let i = 0; i < range; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const messages = await prisma.sentMessages.findMany({
        where: {
          userId: req.me.id,
          createdAt: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
        },
      });
      result.push({ date: date.toISOString(), messages: messages.length });
    }
    if (!clientExists) {
      return mountApiResponse({ ...counts, sentMessages: result, clientSync: false });
    }
    // check if client is sync
    try {
      // console.log('clientExists.sock', clientExists.sock.user?.id)
      //@ts-ignore
      // const clientSync = !!(await clientExists.sock.sendMessage(clientExists.sock.user?.id, { text: 'Olá, mundo!' }))
      // if (!clientSync) {

      // }
      const clientSync = clientExists.sock.sendMessage('559992128746@s.whatsapp.net', { text: 'Olá, mundo!' });
      return mountApiResponse({ ...counts, sentMessages: result, clientSync: true });
    } catch (err) {
      console.log('DEU MERDA!!!!!!!!', err);
      return mountApiResponse(
        { ...counts, sentMessages: result, clientSync: false },
        'Erro ao sincronizar com o cliente',
        'Erro ao sincronizar com o cliente'
      );
    }
  });

  fastify.get('/user/client-logs', async (req, reply) => {
    const logs = await prisma.clientLog.findMany({
      where: {
        Client: {
          userId: req.me.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const totalSyncs = await prisma.clientLog.count({
      where: {
        Client: {
          userId: req.me.id,
        },
        type: 'SYNC',
      },
    });

    const lastConnection = await prisma.clientLog.findFirst({
      where: {
        Client: {
          userId: req.me.id,
        },
        type: 'CONNECT',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return mountApiResponse({
      logs,
      metrics: {
        totalSyncs,
        lastConnection: lastConnection?.createdAt || null,
      },
    });
  });
};

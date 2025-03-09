import { prisma } from "@/lib/prisma.client";
import type { Body } from "@/lib/types/utils";
import type { Client } from "@/lib/wpp/Client";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

export const userController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // my fastify instance has a jwt plugin
  fastify.get("/user/me", async (req, reply) => {
    return mountApiResponse(req.me);
  });
  fastify.get("/clients", async (req, reply) => {
    return mountApiResponse(req.clients.map((c) => c.clientUUid));
  });
  fastify.patch<Body<{ name: string }>>("/user/name", async (req, reply) => {
    const { name } = req.body;
    const userAlreadyHasName = await prisma.user.findFirst({
      where: {
        id: req.me.id,
      },
    });
    if (userAlreadyHasName?.name) {
      return mountApiResponse(
        {},
        "Você já escolheu um nome",
        "Você já escolheu um nome"
      );
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
  fastify.get("/user/initial-data", async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.me.id,
      },
      select: {
        _count: {
          select: {
            Contacts: true,
            Trigger: true,
            SentMessages: true,
            Schedule: true,
          },
        },
      },
    });
    const clientExists = req.clients.find(
      (c: Client) => c.clientUUid === req.me.id
    );
    if (!clientExists) {
      return mountApiResponse({ ...user?._count, clientSync: false });
    }
    // check if client is sync
    try {
      // console.log('clientExists.sock', clientExists.sock.user?.id)
      //@ts-ignore
      // const clientSync = !!(await clientExists.sock.sendMessage(clientExists.sock.user?.id, { text: 'Olá, mundo!' }))
      // if (!clientSync) {

      // }
      const clientSync = clientExists.sock.sendMessage(
        "559992128746@s.whatsapp.net",
        { text: "Olá, mundo!" }
      );
      return mountApiResponse({ ...user?._count, clientSync: true });
    } catch (err) {
      console.log("DEU MERDA!!!!!!!!", err);
      return mountApiResponse(
        { ...user?._count, clientSync: false },
        "Erro ao sincronizar com o cliente",
        "Erro ao sincronizar com o cliente"
      );
    }
  });
};

import { prisma } from "@/lib/prisma.client";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { WhatsAppManager } from "@/lib/wpp/whatsapp.manager";
import { AppError } from "@/lib/appError";
import type { Body } from "@/lib/types/utils";
import type { SendMessageRequest } from "@/lib/types/dtos";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const whatsappController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Obter status atual da conexão
  fastify.get("/whatsapp/status", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const session = WhatsAppManager.getSession(userId);

    const client = await prisma.client.findUnique({
      where: { userId },
    });

    const status = session ? session.status : (client?.status ?? "DISCONNECTED");
    const isConnected = status === "CONNECTED";
    const qr = session?.qrCode ?? client?.qr ?? null;

    return mountApiResponse({
      status,
      isConnected,
      qr,
      phone: client?.phone ?? null,
      name: client?.name ?? null,
      last_conn: client?.last_conn ?? null,
      last_sync: client?.last_sync ?? null,
    });
  });

  // Iniciar conexão e solicitar QR Code
  fastify.post("/whatsapp/connect", async (req, reply) => {
    const userId = (req.user as { id: string }).id;

    const session = await WhatsAppManager.startConnection(userId);

    return mountApiResponse(
      {
        status: session.status,
        qr: session.qrCode ?? null,
      },
      "Iniciando conexão com WhatsApp..."
    );
  });

  // Desconectar / Deslogar WhatsApp
  fastify.post("/whatsapp/logout", async (req, reply) => {
    const userId = (req.user as { id: string }).id;

    await WhatsAppManager.logoutSession(userId);

    return mountApiResponse({}, "Sessão do WhatsApp desconectada.");
  });

  // Enviar mensagem individual direta
  fastify.post<Body<SendMessageRequest>>("/whatsapp/send", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { phone, message } = req.body;

    if (!phone || !message) {
      throw new AppError("Telefone e mensagem são obrigatórios!", 400);
    }

    try {
      await WhatsAppManager.sendMessage(userId, phone, message);
      return mountApiResponse({}, "Mensagem enviada com sucesso!");
    } catch (err: any) {
      throw new AppError(err.message || "Erro ao enviar mensagem", 400);
    }
  });
};

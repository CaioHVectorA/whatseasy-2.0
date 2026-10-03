import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { AppError } from "@/lib/appError";
import { PlaygroundSimulatorAdapter } from "@/lib/engine/playground.adapter";
import { ActionEngine } from "@/lib/engine/action-engine";
import { ConversationStateManager } from "@/lib/engine/conversation-state";

export const playgroundController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Retorna a sessão atual de teste do Playground
  fastify.get("/playground/session", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const session = PlaygroundSimulatorAdapter.getSession(userId);
    const activeConversationState = ConversationStateManager.getSession(
      userId,
      session.contact.phone
    );

    return mountApiResponse({
      ...session,
      conversationState: activeConversationState,
    });
  });

  // Simula uma mensagem enviada pelo lead no Playground
  fastify.post<{
    Body: {
      text: string;
      contact?: {
        name?: string;
        phone?: string;
        customFields?: Record<string, any>;
      };
    };
  }>("/playground/simulate", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { text, contact: contactOverride } = req.body || {};

    if (!text || !text.trim()) {
      throw new AppError("O texto da mensagem é obrigatório.", 400);
    }

    const adapter = new PlaygroundSimulatorAdapter(userId);
    if (contactOverride) {
      PlaygroundSimulatorAdapter.updateContact(userId, contactOverride);
    }

    const session = PlaygroundSimulatorAdapter.getSession(userId);

    // 1. Registra mensagem de entrada do lead simulado
    adapter.recordIncomingMessage(text);

    // 2. Dispara o motor de execução com o canal do simulador
    await ActionEngine.handleIncomingMessage({
      userId,
      contact: session.contact,
      messageText: text,
      remoteJid: `${session.contact.phone}@s.whatsapp.net`,
      channel: adapter,
    });

    const activeConversationState = ConversationStateManager.getSession(
      userId,
      session.contact.phone
    );

    return mountApiResponse({
      ...session,
      conversationState: activeConversationState,
    });
  });

  // Atualiza os dados do contato simulado (ex: nome, cargo, empresa, etc.)
  fastify.put<{
    Body: {
      name?: string;
      phone?: string;
      customFields?: Record<string, any>;
    };
  }>("/playground/contact", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { name, phone, customFields } = req.body || {};

    PlaygroundSimulatorAdapter.updateContact(userId, {
      name,
      phone,
      customFields,
    });

    const session = PlaygroundSimulatorAdapter.getSession(userId);
    return mountApiResponse(session);
  });

  // Reseta o histórico de mensagens e estado da conversa do Playground
  fastify.delete("/playground/session", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const session = PlaygroundSimulatorAdapter.getSession(userId);

    ConversationStateManager.clearSession(userId, session.contact.phone);
    PlaygroundSimulatorAdapter.resetSession(userId);

    return mountApiResponse({}, "Sessão do Playground reiniciada com sucesso!");
  });
};

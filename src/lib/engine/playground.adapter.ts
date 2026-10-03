import type { IMessagingChannel, OutboundMessage } from "./messaging.channel";

export interface PlaygroundMessage {
  id: string;
  sender: "contact" | "bot";
  text: string;
  media?: OutboundMessage["media"];
  timestamp: string;
}

export interface PlaygroundSessionState {
  userId: string;
  contact: {
    id: number;
    name: string;
    phone: string;
    customFields: Record<string, any>;
    clusterIds: number[];
  };
  messages: PlaygroundMessage[];
  lastPresence?: string;
  executedActions: Array<{
    type: string;
    description: string;
    timestamp: string;
    data?: any;
  }>;
}

export class PlaygroundSimulatorAdapter implements IMessagingChannel {
  private static sessions = new Map<string, PlaygroundSessionState>();

  constructor(private userId: string) {}

  getChannelType(): string {
    return "PLAYGROUND_SIMULATOR";
  }

  /**
   * Obtém ou inicializa a sessão de simulação para o usuário
   */
  static getSession(userId: string): PlaygroundSessionState {
    let session = this.sessions.get(userId);
    if (!session) {
      session = {
        userId,
        contact: {
          id: 999999,
          name: "Lead de Teste",
          phone: "5511999998888",
          customFields: {
            empresa: "Acme Corp",
            cargo: "Diretor Comercial",
          },
          clusterIds: [],
        },
        messages: [],
        executedActions: [],
      };
      this.sessions.set(userId, session);
    }
    return session;
  }

  /**
   * Reseta a sessão de teste
   */
  static resetSession(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Atualiza os dados do contato simulado
   */
  static updateContact(userId: string, contactData: Partial<PlaygroundSessionState["contact"]>): void {
    const session = this.getSession(userId);
    session.contact = {
      ...session.contact,
      ...contactData,
      customFields: {
        ...(session.contact.customFields || {}),
        ...(contactData.customFields || {}),
      },
    };
  }

  /**
   * Registra uma ação executada para auditoria em tempo real no simulador
   */
  recordAction(type: string, description: string, data?: any): void {
    const session = PlaygroundSimulatorAdapter.getSession(this.userId);
    session.executedActions.push({
      type,
      description,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Envia uma mensagem da automação para o simulador
   */
  async sendMessage(to: string, message: OutboundMessage): Promise<boolean> {
    const session = PlaygroundSimulatorAdapter.getSession(this.userId);

    session.messages.push({
      id: `bot_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: "bot",
      text: message.text || "",
      media: message.media,
      timestamp: new Date().toISOString(),
    });

    this.recordAction("SEND_MESSAGE", `Mensagem enviada pelo bot: "${message.text}"`, {
      to,
      message,
    });

    return true;
  }

  /**
   * Envia indicação de presença (ex: digitando...)
   */
  async sendPresence(to: string, presence: "composing" | "recording" | "paused"): Promise<void> {
    const session = PlaygroundSimulatorAdapter.getSession(this.userId);
    session.lastPresence = presence;
  }

  /**
   * Registra mensagem enviada pelo lead simulado
   */
  recordIncomingMessage(text: string): void {
    const session = PlaygroundSimulatorAdapter.getSession(this.userId);
    session.messages.push({
      id: `contact_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: "contact",
      text,
      timestamp: new Date().toISOString(),
    });
  }
}

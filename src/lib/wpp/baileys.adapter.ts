import type { WASocket } from "@whiskeysockets/baileys";
import type { IMessagingChannel, OutboundMessage } from "../engine/messaging.channel";

export class WhatsAppBaileysAdapter implements IMessagingChannel {
  constructor(private sock: WASocket) {}

  getChannelType(): string {
    return "BAILEYS_WPP";
  }

  async sendMessage(to: string, message: OutboundMessage): Promise<boolean> {
    const cleanNumber = to.replace(/\D/g, "");
    const jid = `${cleanNumber}@s.whatsapp.net`;

    if (message.media) {
      const media = message.media;
      if (media.type === "image" && media.url) {
        await this.sock.sendMessage(jid, {
          image: { url: media.url },
          caption: message.text || media.caption,
        });
        return true;
      } else if (media.type === "audio" && media.url) {
        await this.sock.sendMessage(jid, {
          audio: { url: media.url },
          mimetype: media.mimetype || "audio/mp4",
          ptt: media.ptt ?? true,
        });
        return true;
      } else if (media.type === "document" && media.url) {
        await this.sock.sendMessage(jid, {
          document: { url: media.url },
          mimetype: media.mimetype || "application/pdf",
          fileName: media.fileName || "documento.pdf",
          caption: message.text,
        });
        return true;
      }
    }

    if (message.text) {
      await this.sock.sendMessage(jid, { text: message.text });
      return true;
    }

    return false;
  }

  async sendPresence(to: string, presence: "composing" | "recording" | "paused"): Promise<void> {
    try {
      const cleanNumber = to.replace(/\D/g, "");
      const jid = `${cleanNumber}@s.whatsapp.net`;
      await this.sock.sendPresenceUpdate(presence, jid);
    } catch {
      // Ignora falhas menores de presença
    }
  }
}

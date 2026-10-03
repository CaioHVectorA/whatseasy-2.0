export interface OutboundMedia {
  url?: string;
  type: "image" | "audio" | "document" | "video";
  caption?: string;
  fileName?: string;
  mimetype?: string;
  ptt?: boolean; // Push-To-Talk (áudio gravado na hora)
  buffer?: Buffer;
}

export interface OutboundMessage {
  text?: string;
  media?: OutboundMedia;
  quotedMessageId?: string;
}

export interface IMessagingChannel {
  /**
   * Envia uma mensagem (texto e/ou mídia) para o destinatário
   */
  sendMessage(to: string, message: OutboundMessage): Promise<boolean>;

  /**
   * Envia indicação de presença (ex: "composing" / digitando... ou "recording" / gravando áudio...)
   */
  sendPresence?(to: string, presence: "composing" | "recording" | "paused"): Promise<void>;

  /**
   * Retorna o identificador do canal (ex: "BAILEYS_WPP" ou "PLAYGROUND_SIMULATOR")
   */
  getChannelType(): string;
}

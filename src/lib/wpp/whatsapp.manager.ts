import BaileysModule, {
  DisconnectReason,
  Browsers,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  type ConnectionState,
  type WAMessage,
  type MessageUpsertType,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { prisma } from "../prisma.client";
import { LoggerService } from "../services/logger.service";
import { ActionEngine } from "../engine/action-engine";
import { WebSocket } from "ws";

const makeWASocket = (
  typeof BaileysModule === "function"
    ? BaileysModule
    : (BaileysModule as any)?.default || (BaileysModule as any)?.makeWASocket || BaileysModule
) as typeof import("@whiskeysockets/baileys").default;

export type WppConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_READY"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

export interface ActiveSession {
  userId: string;
  sock: WASocket;
  status: WppConnectionStatus;
  qrCode?: string;
  wsConnections: Set<WebSocket>;
  reconnectAttempts: number;
}

export class WhatsAppManager {
  private static instances = new Map<string, ActiveSession>();
  private static reconnectTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Obtém a sessão ativa de um usuário, se houver
   */
  static getSession(userId: string): ActiveSession | undefined {
    return this.instances.get(userId);
  }

  /**
   * Registra uma conexão WebSocket para o usuário receber eventos em tempo real
   */
  static registerWs(userId: string, ws: WebSocket) {
    let session = this.instances.get(userId);
    if (session) {
      session.wsConnections.add(ws);
      // Envia o estado atual imediatamente
      this.sendWs(ws, {
        event: "STATUS_UPDATE",
        status: session.status,
        qr: session.qrCode,
        userId,
      });
    }

    ws.on("close", () => {
      if (session) {
        session.wsConnections.delete(ws);
      }
    });
  }

  /**
   * Envia uma mensagem via WebSocket para todas as conexões ativas do usuário
   */
  static broadcast(userId: string, payload: Record<string, any>) {
    const session = this.instances.get(userId);
    if (!session) return;

    for (const ws of session.wsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendWs(ws, payload);
      }
    }
  }

  private static sendWs(ws: WebSocket, payload: Record<string, any>) {
    try {
      ws.send(JSON.stringify({ ...payload, timestamp: new Date().toISOString() }));
    } catch (err) {
      console.error("Error sending WebSocket message:", err);
    }
  }

  /**
   * Resolve um JID ou identificador do WhatsApp para um número de telefone real (@s.whatsapp.net).
   * Caso o JID seja um LID (@lid) ou privacy ID, consulta o mapeamento reverso do Baileys
   * (em memória ou no authFolder em disco) para extrair o telefone real.
   * Se for um LID puro e não for possível mapear para um número real, retorna null.
   */
  public static async resolvePhoneNumber(
    userId: string,
    jid: string,
    extraData?: any
  ): Promise<string | null> {
    if (!jid) return null;

    // 1. Se já for o formato padrão de telefone (@s.whatsapp.net ou @c.us)
    if (jid.includes("@s.whatsapp.net") || jid.includes("@c.us")) {
      const clean = jid.replace(/:.+/, "").replace(/@.+/, "").replace(/\D/g, "");
      return clean.length >= 8 ? clean : null;
    }

    // 2. Se houver phoneNumber explícito no objeto de contato
    if (extraData?.phoneNumber) {
      const clean = String(extraData.phoneNumber)
        .replace(/:.+/, "")
        .replace(/@.+/, "")
        .replace(/\D/g, "");
      if (clean.length >= 8) return clean;
    }

    // 3. Se for LID (@lid ou @hosted.lid)
    if (jid.includes("@lid")) {
      const session = this.instances.get(userId);
      const bareLid = jid.replace(/:.+/, ""); // remove sufixo de dispositivo se houver
      const lidNum = bareLid.replace(/@.+/, "").replace(/\D/g, "");

      // 3.1. Tenta via SignalRepository do Baileys na sessão ativa
      if (session?.sock?.signalRepository?.lidMapping) {
        try {
          const resolvedPn = await session.sock.signalRepository.lidMapping.getPNForLID(bareLid);
          if (resolvedPn) {
            const clean = resolvedPn.replace(/:.+/, "").replace(/@.+/, "").replace(/\D/g, "");
            if (clean.length >= 8) return clean;
          }
        } catch {
          // segue para fallback
        }
      }

      // 3.2. Fallback de busca direta no disco (lid-mapping-{lid}_reverse.json)
      try {
        const authFolder = path.join(process.cwd(), "auths", userId);
        const reverseFile = path.join(authFolder, `lid-mapping-${lidNum}_reverse.json`);
        if (fsSync.existsSync(reverseFile)) {
          const raw = fsSync.readFileSync(reverseFile, "utf-8");
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          const clean = String(parsed).replace(/:.+/, "").replace(/@.+/, "").replace(/\D/g, "");
          if (clean.length >= 8) return clean;
        }
      } catch {
        // segue
      }

      // 3.3. Se for mensagem recebida e o Baileys incluiu participantPn
      if (extraData?.participantPn) {
        const clean = String(extraData.participantPn)
          .replace(/:.+/, "")
          .replace(/@.+/, "")
          .replace(/\D/g, "");
        if (clean.length >= 8) return clean;
      }

      // É um LID interno sem mapeamento para número de telefone real
      return null;
    }

    return null;
  }

  /**
   * Inicia ou recupera a conexão Baileys para o usuário
   */
  static async startConnection(userId: string, forceFresh: boolean = false): Promise<ActiveSession> {
    const existing = this.instances.get(userId);
    // Se já estiver 100% conectado e não for forceFresh, reaproveita a sessão
    if (!forceFresh && existing && existing.status === "CONNECTED" && existing.sock?.user?.id) {
      return existing;
    }

    if (existing) {
      try {
        existing.sock.ev.removeAllListeners("connection.update");
        existing.sock.ev.removeAllListeners("creds.update");
        existing.sock.ev.removeAllListeners("messages.upsert");
        existing.sock.end(undefined);
      } catch {}
      this.instances.delete(userId);
    }

    // Limpa qualquer timeout de reconexão anterior
    const prevTimeout = this.reconnectTimeouts.get(userId);
    if (prevTimeout) {
      clearTimeout(prevTimeout);
      this.reconnectTimeouts.delete(userId);
    }

    const authFolder = path.join(process.cwd(), "auths", userId);
    await fs.mkdir(authFolder, { recursive: true });

    // Apenas limpa a pasta de credenciais se for explicitamente solicitado (ex: logout)
    if (forceFresh) {
      await fs.rm(authFolder, { recursive: true, force: true });
      await fs.mkdir(authFolder, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }) as any),
      },
      browser: Browsers.macOS("Desktop"),
      logger: pino({ level: "silent" }) as any,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000,
    });

    const activeSession: ActiveSession = {
      userId,
      sock,
      status: "CONNECTING",
      wsConnections: existing?.wsConnections ?? new Set<WebSocket>(),
      reconnectAttempts: existing ? existing.reconnectAttempts + 1 : 0,
    };

    this.instances.set(userId, activeSession);

    // Atualiza status no banco
    await prisma.client.upsert({
      where: { userId },
      create: { userId, status: "CONNECTING", isConnected: false },
      update: { status: "CONNECTING", isConnected: false },
    });

    this.broadcast(userId, { event: "STATUS_UPDATE", status: "CONNECTING" });

    // Eventos Baileys
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      await this.handleConnectionUpdate(userId, update);
    });

    sock.ev.on("contacts.upsert", async (contactsList) => {
      for (const c of contactsList) {
        if (!c.id || c.id.includes("@g.us") || c.id.includes("@broadcast") || c.id === "status@broadcast") continue;
        const cleanPhone = await WhatsAppManager.resolvePhoneNumber(userId, c.id, c);
        if (!cleanPhone || cleanPhone.length < 8) continue;
        const name = c.notify || c.name || `Contato ${cleanPhone.slice(-4)}`;

        const exists = await prisma.contacts.findFirst({
          where: { userId, phone: cleanPhone },
        });

        if (!exists) {
          await prisma.contacts.create({
            data: {
              userId,
              phone: cleanPhone,
              name,
              lastInteraction: new Date(),
            },
          });
        }
      }
    });

    sock.ev.on("messages.upsert", async (m: { messages: WAMessage[]; type: MessageUpsertType }) => {
      await this.handleIncomingMessages(userId, m);
    });

    return activeSession;
  }

  /**
   * Trata mudanças no estado da conexão
   */
  private static async handleConnectionUpdate(userId: string, update: Partial<ConnectionState>) {
    const { connection, lastDisconnect, qr } = update;
    const session = this.instances.get(userId);

    // QR Code gerado
    if (qr) {
      try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        if (session) {
          session.qrCode = qrDataUrl;
          session.status = "QR_READY";
        }

        await prisma.client.upsert({
          where: { userId },
          create: { userId, qr: qrDataUrl, status: "QR_READY", isConnected: false },
          update: { qr: qrDataUrl, status: "QR_READY", isConnected: false },
        });

        this.broadcast(userId, {
          event: "QR",
          status: "QR_READY",
          qr: qrDataUrl,
          message: "Escaneie o QR Code no seu WhatsApp",
        });

        await LoggerService.log({
          userId,
          eventType: "WPP_QR",
          description: "Novo QR Code gerado para autenticação.",
          status: "INFO",
        });
      } catch (err) {
        console.error("Error generating QR code:", err);
      }
    }

    // Conexão Estabelecida com Sucesso
    if (connection === "open") {
      const userPhone = session?.sock.user?.id ? session.sock.user.id.split(":")[0] : undefined;
      const userName = session?.sock.user?.name ?? undefined;

      if (session) {
        session.status = "CONNECTED";
        session.qrCode = undefined;
        session.reconnectAttempts = 0;
      }

      await prisma.client.upsert({
        where: { userId },
        create: {
          userId,
          status: "CONNECTED",
          isConnected: true,
          phone: userPhone,
          name: userName,
          qr: null,
          last_conn: new Date(),
          last_sync: new Date(),
        },
        update: {
          status: "CONNECTED",
          isConnected: true,
          phone: userPhone,
          name: userName,
          qr: null,
          last_conn: new Date(),
          last_sync: new Date(),
        },
      });

      this.broadcast(userId, {
        event: "CONNECTED",
        status: "CONNECTED",
        phone: userPhone,
        name: userName,
        message: "WhatsApp conectado com sucesso!",
      });

      await LoggerService.log({
        userId,
        eventType: "WPP_CONNECT",
        description: `WhatsApp conectado com sucesso (${userPhone ?? "sessão ativa"}).`,
        status: "SUCCESS",
      });
    }

    // Conexão Fechada / Queda
    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;

      if (isLoggedOut) {
        if (session) {
          session.status = "DISCONNECTED";
          session.qrCode = undefined;
        }
        this.instances.delete(userId);

        const authFolder = path.join(process.cwd(), "auths", userId);
        try {
          await fs.rm(authFolder, { recursive: true, force: true });
        } catch {}

        await prisma.client.updateMany({
          where: { userId },
          data: { status: "DISCONNECTED", isConnected: false, qr: null, phone: null, name: null },
        });

        this.broadcast(userId, {
          event: "DISCONNECTED",
          status: "DISCONNECTED",
          message: "Sessão do WhatsApp deslogada.",
        });

        await LoggerService.log({
          userId,
          eventType: "WPP_DISCONNECT",
          description: "Sessão deslogada pelo WhatsApp.",
          status: "INFO",
        });
        return;
      }

      // Código 515 ocorre exatamente após o celular escanear o QR Code para concluir o pareamento
      if (isRestartRequired) {
        console.log(`[WhatsAppManager] 515 restartRequired recebido após leitura de QR. Concluindo autenticação imediatamente para ${userId}...`);
        this.startConnection(userId).catch((err) => {
          console.error("Erro ao reconectar após 515 restartRequired:", err);
        });
        return;
      }

      // Se a conexão fechou por oscilação temporária de rede ou handshake
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log(`[WhatsAppManager] Conexão fechada (${statusCode ?? "normal"}). Reconectando em 2s para ${userId}...`);
        const timeout = setTimeout(() => {
          this.startConnection(userId).catch((err) => {
            console.error("Erro ao reiniciar conexão:", err);
          });
        }, 2000);

        this.reconnectTimeouts.set(userId, timeout);
      }
    }
  }

  /**
   * Processa mensagens recebidas em tempo real
   */
  private static async handleIncomingMessages(
    userId: string,
    m: { messages: WAMessage[]; type: MessageUpsertType }
  ) {
    if (!m.messages || m.messages.length === 0) return;

    for (const msg of m.messages) {
      // Ignora mensagens enviadas pelo próprio bot
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      if (
        !remoteJid ||
        remoteJid.includes("@g.us") ||
        remoteJid.endsWith("@broadcast") ||
        remoteJid === "status@broadcast" ||
        msg.broadcast ||
        msg.key.participant?.includes("@broadcast")
      ) {
        continue; // ignora grupos, status e transmissões
      }

      // Extração de texto de múltiplos formatos Baileys
      const messageContent =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        "";

      // Resolve o número de telefone real tratando LIDs (@lid) do WhatsApp
      const cleanPhone = await WhatsAppManager.resolvePhoneNumber(userId, remoteJid, msg);
      if (!cleanPhone) {
        continue; // Ignora LIDs não mapeados para evitar cadastros com números fantasmas
      }
      const pushName = msg.pushName || `Contato ${cleanPhone.slice(-4)}`;

      // Salva/Atualiza o contato no banco de dados automaticamente
      let contact = await prisma.contacts.findFirst({
        where: { userId, phone: cleanPhone },
      });

      if (!contact) {
        contact = await prisma.contacts.create({
          data: {
            userId,
            phone: cleanPhone,
            name: pushName,
            lastInteraction: new Date(),
          },
        });

        await LoggerService.log({
          userId,
          eventType: "CONTACT_CREATED",
          contactPhone: cleanPhone,
          contactName: pushName,
          description: `Novo contato identificado: ${pushName} (${cleanPhone}).`,
        });
      } else {
        await prisma.contacts.update({
          where: { id: contact.id },
          data: {
            name: contact.name.startsWith("Contato ") && pushName ? pushName : contact.name,
            lastInteraction: new Date(),
          },
        });
      }

      if (messageContent) {
        await LoggerService.log({
          userId,
          eventType: "MSG_RECEIVED",
          contactPhone: cleanPhone,
          contactName: contact.name,
          description: `Mensagem recebida de ${contact.name}: "${messageContent}"`,
        });

        // Notifica o frontend via WebSocket
        this.broadcast(userId, {
          event: "MSG_RECEIVED",
          contactPhone: cleanPhone,
          contactName: contact.name,
          message: messageContent,
        });

        // Dispara o motor de execução para reativos e gatilhos
        const session = this.instances.get(userId);
        if (session && session.sock) {
          await ActionEngine.handleIncomingMessage({
            userId,
            contact,
            messageText: messageContent,
            remoteJid,
            sock: session.sock,
          });
        }
      }
    }
  }

  /**
   * Envia uma mensagem individual para um número
   */
  static async sendMessage(userId: string, phone: string, text: string): Promise<boolean> {
    const session = this.instances.get(userId);
    if (!session || session.status !== "CONNECTED") {
      throw new Error("WhatsApp não está conectado. Conecte antes de enviar mensagens.");
    }

    const cleanNumber = phone.replace(/\D/g, "");
    const jid = `${cleanNumber}@s.whatsapp.net`;

    await session.sock.sendMessage(jid, { text });

    // Salva mensagem enviada e atualiza última interação
    await prisma.sentMessages.create({
      data: {
        userId,
        phone: cleanNumber,
        message: text,
      },
    });

    await prisma.contacts.updateMany({
      where: { userId, phone: cleanNumber },
      data: { lastInteraction: new Date() },
    });

    await LoggerService.log({
      userId,
      eventType: "MSG_SENT",
      contactPhone: cleanNumber,
      description: `Mensagem enviada para ${cleanNumber}: "${text}"`,
      automationType: "MANUAL",
    });

    return true;
  }

  /**
   * Desconecta o WhatsApp e exclui as credenciais da sessão
   */
  static async logoutSession(userId: string): Promise<void> {
    const session = this.instances.get(userId);
    if (session) {
      try {
        session.sock.ev.removeAllListeners("connection.update");
        session.sock.ev.removeAllListeners("creds.update");
        session.sock.ev.removeAllListeners("messages.upsert");
        await session.sock.logout().catch(() => {});
        session.sock.end(undefined);
      } catch (err) {
        console.error("Error terminating socket:", err);
      }
      this.instances.delete(userId);
    }

    const authFolder = path.join(process.cwd(), "auths", userId);
    try {
      await fs.rm(authFolder, { recursive: true, force: true });
    } catch {}

    await prisma.client.updateMany({
      where: { userId },
      data: { status: "DISCONNECTED", isConnected: false, qr: null, phone: null, name: null },
    });

    this.broadcast(userId, {
      event: "DISCONNECTED",
      status: "DISCONNECTED",
      message: "Sessão do WhatsApp encerrada com sucesso.",
    });

    await LoggerService.log({
      userId,
      eventType: "WPP_DISCONNECT",
      description: "Logout manual do WhatsApp realizado.",
      status: "INFO",
    });
  }

  /**
   * Restaura todas as sessões salvas ao iniciar o servidor
   */
  static async restoreSavedSessions(): Promise<void> {
    try {
      const authsDir = path.join(process.cwd(), "auths");
      const exists = await fs.access(authsDir).then(() => true).catch(() => false);
      if (!exists) return;

      const userDirs = await fs.readdir(authsDir);
      for (const userId of userDirs) {
        const credsFile = path.join(authsDir, userId, "creds.json");
        const credsExists = await fs.access(credsFile).then(() => true).catch(() => false);
        if (!credsExists) continue;

        try {
          const credsContent = JSON.parse(await fs.readFile(credsFile, "utf-8"));
          if (credsContent.me?.id) {
            console.log(`[WhatsAppManager] Restaurando sessão autenticada para o usuário: ${userId} (${credsContent.me.id})`);
            this.startConnection(userId).catch((err) => {
              console.error(`[WhatsAppManager] Falha ao restaurar sessão para ${userId}:`, err);
            });
          } else {
            console.log(`[WhatsAppManager] Limpando pasta de sessão sem login para: ${userId}`);
            await fs.rm(path.join(authsDir, userId), { recursive: true, force: true });
          }
        } catch {
          await fs.rm(path.join(authsDir, userId), { recursive: true, force: true });
        }
      }
    } catch (err) {
      console.error("[WhatsAppManager] Erro ao restaurar sessões salvas:", err);
    }
  }
}

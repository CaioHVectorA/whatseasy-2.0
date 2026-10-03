export type InputValidationType =
  | "ANY"
  | "TEXT"
  | "NUMBER"
  | "EMAIL"
  | "PHONE"
  | "OPTION";

export interface MenuOption {
  key: string; // Ex: "1", "2" ou palavra-chave
  label: string; // Ex: "Falar com Atendente"
  targetNodeId?: string; // Próximo nó no fluxo do Canvas
  targetClusterId?: number; // Cluster para adicionar se escolhido
  actionConfig?: Record<string, any>;
}

export interface ConversationSession {
  userId: string;
  contactPhone: string;
  flowId?: number | string;
  currentNodeId?: string;
  stepNumber: number;
  waitingInput: boolean;
  validationType: InputValidationType;
  validOptions: MenuOption[];
  targetFieldKey?: string; // Salvar resposta do usuário neste campo customizado
  variables: Record<string, any>;
  fallbackMessage?: string;
  menuTitle?: string;
  menuRawText?: string;
  updatedAt: Date;
  expiresAt: Date;
}

export class ConversationStateManager {
  private static sessions = new Map<string, ConversationSession>();
  private static readonly DEFAULT_TIMEOUT_MINUTES = 30;

  private static getKey(userId: string, contactPhone: string): string {
    const cleanPhone = contactPhone.replace(/\D/g, "");
    return `${userId}:${cleanPhone}`;
  }

  /**
   * Obtém a sessão ativa de conversação de um contato, limpando automaticamente se tiver expirado
   */
  static getSession(userId: string, contactPhone: string): ConversationSession | null {
    const key = this.getKey(userId, contactPhone);
    const session = this.sessions.get(key);

    if (!session) return null;

    // Checagem de expiração
    if (new Date() > session.expiresAt) {
      this.sessions.delete(key);
      return null;
    }

    return session;
  }

  /**
   * Cria ou atualiza a sessão de conversação
   */
  static setSession(
    userId: string,
    contactPhone: string,
    data: Partial<ConversationSession>
  ): ConversationSession {
    const key = this.getKey(userId, contactPhone);
    const existing = this.getSession(userId, contactPhone);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.DEFAULT_TIMEOUT_MINUTES * 60 * 1000);

    const updatedSession: ConversationSession = {
      userId,
      contactPhone: contactPhone.replace(/\D/g, ""),
      flowId: data.flowId ?? existing?.flowId,
      currentNodeId: data.currentNodeId ?? existing?.currentNodeId,
      stepNumber: data.stepNumber ?? (existing ? existing.stepNumber + 1 : 1),
      waitingInput: data.waitingInput ?? true,
      validationType: data.validationType ?? "ANY",
      validOptions: data.validOptions ?? existing?.validOptions ?? [],
      targetFieldKey: data.targetFieldKey ?? existing?.targetFieldKey,
      variables: { ...(existing?.variables || {}), ...(data.variables || {}) },
      fallbackMessage: data.fallbackMessage ?? existing?.fallbackMessage,
      menuTitle: data.menuTitle ?? existing?.menuTitle,
      menuRawText: data.menuRawText ?? existing?.menuRawText,
      updatedAt: now,
      expiresAt,
    };

    this.sessions.set(key, updatedSession);
    return updatedSession;
  }

  /**
   * Remove a sessão ativa (encerra o fluxo)
   */
  static clearSession(userId: string, contactPhone: string): void {
    const key = this.getKey(userId, contactPhone);
    this.sessions.delete(key);
  }

  /**
   * Formata visualmente um menu numerado ou com botões de texto amigáveis para WhatsApp
   */
  static formatMenuText(
    title: string,
    options: MenuOption[],
    footer = "Digite o número da opção desejada:"
  ): string {
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const lines: string[] = [];
    if (title) {
      lines.push(`*${title.trim()}*\n`);
    }

    options.forEach((opt, index) => {
      const emoji = numberEmojis[index] || `[${index + 1}]`;
      lines.push(`${emoji} ${opt.label}`);
    });

    if (footer) {
      lines.push(`\n_${footer}_`);
    }

    return lines.join("\n");
  }

  /**
   * Valida a entrada enviada pelo contato contra a regra da sessão atual
   */
  static validateInput(
    session: ConversationSession,
    incomingText: string
  ): {
    isValid: boolean;
    matchedOption?: MenuOption;
    parsedValue?: any;
    errorFeedback?: string;
  } {
    const cleanText = incomingText.trim();
    const lower = cleanText.toLowerCase();

    // 1. Validação de Opção de Menu
    if (session.validationType === "OPTION") {
      // Procura por número (ex: "1") ou por texto exato do label/chave
      const matched = session.validOptions.find((opt, idx) => {
        const indexStr = String(idx + 1);
        return (
          opt.key.toLowerCase() === lower ||
          opt.label.toLowerCase() === lower ||
          indexStr === lower ||
          opt.key.replace(/\D/g, "") === cleanText
        );
      });

      if (matched) {
        return { isValid: true, matchedOption: matched, parsedValue: matched.label };
      }

      const defaultMsg =
        session.fallbackMessage ||
        "Opção inválida! Por favor, escolha um dos números listados acima.";
      return { isValid: false, errorFeedback: defaultMsg };
    }

    // 2. Validação de Número
    if (session.validationType === "NUMBER") {
      const num = Number(cleanText.replace(",", "."));
      if (!isNaN(num) && cleanText !== "") {
        return { isValid: true, parsedValue: num };
      }
      return {
        isValid: false,
        errorFeedback: session.fallbackMessage || "Por favor, digite apenas números válidos.",
      };
    }

    // 3. Validação de E-mail
    if (session.validationType === "EMAIL") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(cleanText)) {
        return { isValid: true, parsedValue: cleanText.toLowerCase() };
      }
      return {
        isValid: false,
        errorFeedback:
          session.fallbackMessage || "Por favor, informe um endereço de e-mail válido (ex: seu@email.com).",
      };
    }

    // 4. Validação de Telefone
    if (session.validationType === "PHONE") {
      const digits = cleanText.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 15) {
        return { isValid: true, parsedValue: digits };
      }
      return {
        isValid: false,
        errorFeedback:
          session.fallbackMessage || "Por favor, informe um número de telefone com DDD válido.",
      };
    }

    // 5. Validação de Texto Geral (não vazio)
    if (cleanText.length > 0) {
      return { isValid: true, parsedValue: cleanText };
    }

    return {
      isValid: false,
      errorFeedback: session.fallbackMessage || "Por favor, envie uma mensagem com o texto solicitado.",
    };
  }
}

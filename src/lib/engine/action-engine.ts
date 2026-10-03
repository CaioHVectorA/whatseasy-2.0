import { prisma } from "../prisma.client";
import { LoggerService } from "../services/logger.service";
import type { Contacts } from "@prisma/client";
import type { WASocket } from "@whiskeysockets/baileys";
import type { IMessagingChannel, OutboundMessage } from "./messaging.channel";
import { WhatsAppBaileysAdapter } from "../wpp/baileys.adapter";
import { ConversationStateManager, type MenuOption } from "./conversation-state";

export interface IncomingMessageContext {
  userId: string;
  contact: Contacts | any;
  messageText: string;
  remoteJid?: string;
  sock?: WASocket;
  channel?: IMessagingChannel;
}

export class ActionEngine {
  /**
   * Resolve o canal de mensageria apropriado (Playground ou Baileys real)
   */
  private static resolveChannel(ctx: IncomingMessageContext): IMessagingChannel {
    if (ctx.channel) return ctx.channel;
    if (ctx.sock) return new WhatsAppBaileysAdapter(ctx.sock);
    throw new Error("Nenhum canal de mensageria ou socket Baileys fornecido para o ActionEngine.");
  }

  /**
   * Avalia e executa mensagens recebidas (tanto do WhatsApp real quanto do Playground)
   */
  static async handleIncomingMessage(ctx: IncomingMessageContext): Promise<void> {
    const { userId, contact, messageText } = ctx;
    const cleanText = messageText.trim();
    const cleanLower = cleanText.toLowerCase();
    const channel = this.resolveChannel(ctx);
    const targetRecipient = ctx.remoteJid || contact.phone;

    // ================= 1. VERIFICAÇÃO DE SESSÃO CONVERSACIONAL ATIVA ================= //
    const activeSession = ConversationStateManager.getSession(userId, contact.phone);

    if (activeSession && activeSession.waitingInput) {
      const validation = ConversationStateManager.validateInput(activeSession, cleanText);

      // Se a entrada for inválida para o menu/pergunta atual
      if (!validation.isValid) {
        const errorText = validation.errorFeedback || "Opção inválida!";
        await channel.sendMessage(targetRecipient, { text: errorText });

        // Se houver texto do menu armazenado, reenvia para o usuário não se perder
        if (activeSession.menuRawText) {
          await channel.sendMessage(targetRecipient, { text: activeSession.menuRawText });
        }

        await LoggerService.log({
          userId,
          eventType: "REACTIVE_TRIGGERED",
          contactPhone: contact.phone,
          contactName: contact.name,
          automationType: "REACTIVE",
          description: `Resposta inválida de ${contact.name}: "${cleanText}". Menu reenviado.`,
        });

        return;
      }

      // Se a entrada for válida, salva o dado capturado
      const parsedValue = validation.parsedValue;

      // Atualiza variáveis em memória
      if (activeSession.targetFieldKey) {
        activeSession.variables[activeSession.targetFieldKey] = parsedValue;

        // Persiste nos campos customizados do contato se for contato real
        let currentFields: Record<string, any> = {};
        try {
          if (contact.customFields) {
            currentFields =
              typeof contact.customFields === "string"
                ? JSON.parse(contact.customFields)
                : contact.customFields;
          }
        } catch {}
        currentFields[activeSession.targetFieldKey] = parsedValue;
        contact.customFields = currentFields;

        if (contact.id && contact.id !== 999999) {
          await prisma.contacts
            .update({
              where: { id: contact.id },
              data: { customFields: JSON.stringify(currentFields) },
            })
            .catch(() => {});
        }
      }

      // Se a opção selecionada tiver ação direta associada (ex: vincular a cluster)
      if (validation.matchedOption?.targetClusterId) {
        const cId = Number(validation.matchedOption.targetClusterId);
        contact.clusterId = cId;
        if (contact.id && contact.id !== 999999) {
          await prisma.contactClusterRelation
            .upsert({
              where: { contactId_clusterId: { contactId: contact.id, clusterId: cId } },
              create: { contactId: contact.id, clusterId: cId },
              update: {},
            })
            .catch(() => {});
        }
      }

      // Resposta de confirmação ou próximo nó do fluxo
      if (validation.matchedOption?.actionConfig?.replyText) {
        const reply = this.formatVariables(validation.matchedOption.actionConfig.replyText, contact);
        await channel.sendMessage(targetRecipient, { text: reply });
      }

      // Encerra ou avança a sessão conversacional
      ConversationStateManager.clearSession(userId, contact.phone);

      await LoggerService.log({
        userId,
        eventType: "REACTIVE_TRIGGERED",
        contactPhone: contact.phone,
        contactName: contact.name,
        automationType: "REACTIVE",
        description: `Opção/dado processado com sucesso para ${contact.name}: "${parsedValue}".`,
      });

      return;
    }

    // ================= 2. VERIFICAÇÃO DE REATIVOS ATIVOS ================= //
    const reactives = await prisma.trigger.findMany({
      where: {
        userId,
        kind: "REACTIVE",
        active: true,
      },
      include: {
        TextTrigger: true,
        TriggerClusterRelation: {
          include: {
            TriggerCluster: true,
          },
        },
        ResponseTriggerRelation: {
          include: {
            Response: true,
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    for (const reactive of reactives) {
      // 1. Verificação de Cluster
      if (reactive.TriggerClusterRelation.length > 0) {
        let matchesCluster = false;
        for (const rel of reactive.TriggerClusterRelation) {
          const isInside = contact.clusterId === rel.triggerClusterId;
          if (rel.included && isInside) {
            matchesCluster = true;
            break;
          } else if (!rel.included && !isInside) {
            matchesCluster = true;
            break;
          }
        }
        if (!matchesCluster) continue;
      }

      // 2. Verificação de Condição de Texto
      if (reactive.TextTrigger.length > 0) {
        let matchedText = false;
        for (const trigger of reactive.TextTrigger) {
          const pattern = trigger.text.trim().toLowerCase();
          switch (trigger.type) {
            case "EQUALS":
              if (cleanLower === pattern) matchedText = true;
              break;
            case "CONTAINS":
              if (cleanLower.includes(pattern)) matchedText = true;
              break;
            case "STARTS_WITH":
              if (cleanLower.startsWith(pattern)) matchedText = true;
              break;
            case "ENDS_WITH":
              if (cleanLower.endsWith(pattern)) matchedText = true;
              break;
            case "REGEX":
              try {
                const regex = new RegExp(trigger.text, "i");
                if (regex.test(messageText)) matchedText = true;
              } catch (e) {
                console.error("Invalid regex in reactive:", trigger.text);
              }
              break;
          }
          if (matchedText) break;
        }
        if (!matchedText) continue;
      }

      // 3. Execução das Ações do Reativo
      await this.executeReactiveActions(reactive, contact, targetRecipient, channel, userId);

      // Incrementa contador de uso no banco
      if (reactive.id) {
        await prisma.trigger
          .update({
            where: { id: reactive.id },
            data: { usageCount: { increment: 1 } },
          })
          .catch(() => {});

        await prisma.triggerLog
          .create({
            data: { triggerId: reactive.id },
          })
          .catch(() => {});
      }

      await LoggerService.log({
        userId,
        eventType: "REACTIVE_TRIGGERED",
        contactPhone: contact.phone,
        contactName: contact.name,
        automationType: "REACTIVE",
        automationId: reactive.id,
        description: `Reativo "${reactive.name}" acionado pela mensagem "${messageText}".`,
      });

      // Encerra após encontrar o reativo correspondente com prioridade
      break;
    }
  }

  /**
   * Executa a lista de respostas e blocos de um reativo ou nó do canvas
   */
  static async executeReactiveActions(
    reactive: any,
    contact: any,
    targetRecipient: string,
    channel: IMessagingChannel,
    userId: string
  ): Promise<void> {
    const delayMs = (reactive.delaySeconds || 0) * 1000;

    const executeAll = async () => {
      // 1. Executa respostas simples
      if (Array.isArray(reactive.ResponseTriggerRelation)) {
        for (const rel of reactive.ResponseTriggerRelation) {
          const response = rel.Response;
          if (!response || !response.content) continue;

          const parsedContent = this.formatVariables(response.content, contact);
          try {
            await channel.sendMessage(targetRecipient, { text: parsedContent });

            if (response.id) {
              await prisma.responseLog.create({ data: { responseId: response.id } }).catch(() => {});
            }

            if (userId && contact.phone && contact.id !== 999999) {
              await prisma.sentMessages
                .create({
                  data: {
                    userId,
                    phone: contact.phone,
                    message: parsedContent,
                  },
                })
                .catch(() => {});
            }
          } catch (err: any) {
            console.error("Error sending response:", err);
          }
        }
      }

      // 2. Executa fluxos de blocos / Menus avançados se configurados
      if (reactive.actionConfig) {
        try {
          const config =
            typeof reactive.actionConfig === "string"
              ? JSON.parse(reactive.actionConfig)
              : reactive.actionConfig;

          // Se for envio de MENU interativo
          if (config.menu && Array.isArray(config.menu.options) && config.menu.options.length > 0) {
            const menuTitle = this.formatVariables(config.menu.title || "Menu de Opções", contact);
            const menuFooter = config.menu.footer || "Digite o número da opção desejada:";
            const formattedMenuText = ConversationStateManager.formatMenuText(
              menuTitle,
              config.menu.options,
              menuFooter
            );

            await channel.sendMessage(targetRecipient, { text: formattedMenuText });

            // Registra a máquina de estados para aguardar a escolha do usuário
            ConversationStateManager.setSession(userId, contact.phone, {
              flowId: reactive.id,
              waitingInput: true,
              validationType: "OPTION",
              validOptions: config.menu.options,
              menuTitle,
              menuRawText: formattedMenuText,
              fallbackMessage: config.menu.fallbackMessage,
            });

            return; // Interrompe para aguardar a resposta do usuário
          }

          // Se for fluxo de passos (Multi-Step / Canvas Blocks)
          if (Array.isArray(config.steps) && config.steps.length > 0) {
            for (const step of config.steps) {
              if (step.delaySeconds && step.delaySeconds > 0) {
                await new Promise((res) => setTimeout(res, step.delaySeconds * 1000));
              }

              if (step.type === "SEND_MESSAGE" && step.content) {
                const text = this.formatVariables(step.content, contact);
                const outboundMsg: OutboundMessage = { text };
                if (step.mediaUrl) {
                  outboundMsg.media = {
                    url: step.mediaUrl,
                    type: step.mediaType || "image",
                    caption: text,
                  };
                }
                await channel.sendMessage(targetRecipient, outboundMsg);
              } else if (step.type === "SEND_MENU" && Array.isArray(step.options)) {
                const title = this.formatVariables(step.title || "Escolha uma opção:", contact);
                const menuText = ConversationStateManager.formatMenuText(title, step.options, step.footer);
                await channel.sendMessage(targetRecipient, { text: menuText });

                ConversationStateManager.setSession(userId, contact.phone, {
                  flowId: reactive.id,
                  waitingInput: true,
                  validationType: "OPTION",
                  validOptions: step.options,
                  menuTitle: title,
                  menuRawText: menuText,
                  fallbackMessage: step.fallbackMessage,
                });
                break; // Aguarda resposta
              } else if (step.type === "WAIT_INPUT") {
                if (step.prompt) {
                  const promptText = this.formatVariables(step.prompt, contact);
                  await channel.sendMessage(targetRecipient, { text: promptText });
                }
                ConversationStateManager.setSession(userId, contact.phone, {
                  flowId: reactive.id,
                  waitingInput: true,
                  validationType: step.validationType || "TEXT",
                  targetFieldKey: step.fieldKey,
                  fallbackMessage: step.fallbackMessage,
                });
                break; // Aguarda resposta
              } else if (step.type === "ADD_CLUSTER" && step.clusterId) {
                const targetClusterId = Number(step.clusterId);
                contact.clusterId = targetClusterId;
                if (contact.id && contact.id !== 999999) {
                  await prisma.contactClusterRelation
                    .upsert({
                      where: { contactId_clusterId: { contactId: contact.id, clusterId: targetClusterId } },
                      create: { contactId: contact.id, clusterId: targetClusterId },
                      update: {},
                    })
                    .catch(() => {});
                  await prisma.contacts
                    .update({
                      where: { id: contact.id },
                      data: { clusterId: targetClusterId },
                    })
                    .catch(() => {});
                }
              } else if (step.type === "REMOVE_CLUSTER" && step.clusterId) {
                const targetClusterId = Number(step.clusterId);
                if (contact.id && contact.id !== 999999) {
                  await prisma.contactClusterRelation
                    .deleteMany({
                      where: { contactId: contact.id, clusterId: targetClusterId },
                    })
                    .catch(() => {});
                }
              } else if (step.type === "UPDATE_FIELD" && step.fieldKey) {
                let currentFields: Record<string, any> = {};
                try {
                  if (contact.customFields) {
                    currentFields =
                      typeof contact.customFields === "string"
                        ? JSON.parse(contact.customFields)
                        : contact.customFields;
                  }
                } catch {}
                currentFields[step.fieldKey] = this.formatVariables(step.fieldValue || "", contact);
                contact.customFields = currentFields;
                if (contact.id && contact.id !== 999999) {
                  await prisma.contacts
                    .update({
                      where: { id: contact.id },
                      data: { customFields: JSON.stringify(currentFields) },
                    })
                    .catch(() => {});
                }
              }
            }
          }
        } catch (err) {
          console.error("Error executing reactive action block:", err);
        }
      }
    };

    if (delayMs > 0) {
      setTimeout(executeAll, delayMs);
    } else {
      await executeAll();
    }
  }

  /**
   * Substitui tags dinâmicas padrão ({nome}, {primeiro_nome}, {telefone}) e qualquer campo chave-valor customizado ({empresa}, {cargo}, etc.)
   */
  static formatVariables(template: string, contact: any): string {
    if (!template) return "";
    let output = template
      .replace(/{nome}/gi, contact.name || "Cliente")
      .replace(/{telefone}/gi, contact.phone || "")
      .replace(/{primeiro_nome}/gi, (contact.name || "Cliente").split(" ")[0]);

    // Interpolação de campos dinâmicos customizados
    if (contact.customFields) {
      try {
        const fields =
          typeof contact.customFields === "string"
            ? JSON.parse(contact.customFields)
            : contact.customFields;
        if (typeof fields === "object" && fields !== null) {
          for (const [key, val] of Object.entries(fields)) {
            const regex = new RegExp(`{${key}}`, "gi");
            output = output.replace(regex, String(val ?? ""));
          }
        }
      } catch {}
    }

    return output;
  }
}

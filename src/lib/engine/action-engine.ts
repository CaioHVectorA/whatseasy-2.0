import { prisma } from "../prisma.client";
import { LoggerService } from "../services/logger.service";
import type { Contacts } from "@prisma/client";
import type { WASocket } from "@whiskeysockets/baileys";

export interface IncomingMessageContext {
  userId: string;
  contact: Contacts;
  messageText: string;
  remoteJid: string;
  sock: WASocket;
}

export class ActionEngine {
  /**
   * Avalia e executa reativos correspondentes a uma mensagem recebida
   */
  static async handleIncomingMessage(ctx: IncomingMessageContext): Promise<void> {
    const { userId, contact, messageText, remoteJid, sock } = ctx;
    const cleanText = messageText.trim().toLowerCase();

    // Busca todos os reativos ativos do usuário com suas relações
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
      // 1. Verificação de Cluster (se houver restrição)
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
              if (cleanText === pattern) matchedText = true;
              break;
            case "CONTAINS":
              if (cleanText.includes(pattern)) matchedText = true;
              break;
            case "STARTS_WITH":
              if (cleanText.startsWith(pattern)) matchedText = true;
              break;
            case "ENDS_WITH":
              if (cleanText.endsWith(pattern)) matchedText = true;
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
      await this.executeReactiveActions(reactive, contact, remoteJid, sock, userId);

      // Incrementa contador de uso
      await prisma.trigger.update({
        where: { id: reactive.id },
        data: {
          usageCount: { increment: 1 },
        },
      });

      await prisma.triggerLog.create({
        data: { triggerId: reactive.id },
      });

      await LoggerService.log({
        userId,
        eventType: "REACTIVE_TRIGGERED",
        contactPhone: contact.phone,
        contactName: contact.name,
        automationType: "REACTIVE",
        automationId: reactive.id,
        description: `Reativo "${reactive.name}" acionado pela mensagem "${messageText}".`,
      });

      // Se encontrou e executou um reativo com prioridade, encerra o processamento para esta mensagem
      break;
    }
  }

  /**
   * Executa a lista de respostas e ações de um reativo
   */
  private static async executeReactiveActions(
    reactive: any,
    contact: Contacts,
    remoteJid: string,
    sock: WASocket,
    userId: string
  ): Promise<void> {
    const delayMs = (reactive.delaySeconds || 0) * 1000;

    const executeResponses = async () => {
      for (const rel of reactive.ResponseTriggerRelation) {
        const response = rel.Response;
        if (!response || !response.content) continue;

        // Substituição de variáveis dinâmicas no texto
        const parsedContent = this.formatVariables(response.content, contact);

        try {
          await sock.sendMessage(remoteJid, { text: parsedContent });

          await prisma.responseLog.create({
            data: { responseId: response.id },
          });

          await prisma.sentMessages.create({
            data: {
              userId,
              phone: contact.phone,
              message: parsedContent,
            },
          });

          await LoggerService.log({
            userId,
            eventType: "MSG_SENT",
            contactPhone: contact.phone,
            contactName: contact.name,
            automationType: "REACTIVE",
            automationId: reactive.id,
            description: `Resposta automática enviada para ${contact.name}: "${parsedContent}"`,
          });
        } catch (err: any) {
          console.error("Error sending reactive response:", err);
          await LoggerService.log({
            userId,
            eventType: "ERROR",
            contactPhone: contact.phone,
            automationType: "REACTIVE",
            automationId: reactive.id,
            status: "ERROR",
            description: `Falha ao enviar resposta automática: ${err.message}`,
          });
        }
      }

      // Executa fluxos de blocos avançados se configurados
      if (reactive.actionConfig) {
        try {
          const config = JSON.parse(reactive.actionConfig);

          // Se for fluxo em blocos (multi-step)
          if (Array.isArray(config.steps) && config.steps.length > 0) {
            for (const step of config.steps) {
              if (step.delaySeconds && step.delaySeconds > 0) {
                await new Promise((res) => setTimeout(res, step.delaySeconds * 1000));
              }

              if (step.type === "SEND_MESSAGE" && step.content) {
                const text = this.formatVariables(step.content, contact);
                await sock.sendMessage(remoteJid, { text });
                await prisma.sentMessages.create({
                  data: { userId, phone: contact.phone, message: text },
                });
              } else if (step.type === "ADD_CLUSTER" && step.clusterId) {
                const targetClusterId = Number(step.clusterId);
                await prisma.contactClusterRelation.upsert({
                  where: {
                    contactId_clusterId: { contactId: contact.id, clusterId: targetClusterId },
                  },
                  create: { contactId: contact.id, clusterId: targetClusterId },
                  update: {},
                });
                await prisma.contacts.update({
                  where: { id: contact.id },
                  data: { clusterId: targetClusterId },
                });
              } else if (step.type === "REMOVE_CLUSTER" && step.clusterId) {
                const targetClusterId = Number(step.clusterId);
                await prisma.contactClusterRelation.deleteMany({
                  where: { contactId: contact.id, clusterId: targetClusterId },
                });
              } else if (step.type === "UPDATE_FIELD" && step.fieldKey) {
                let currentFields: Record<string, any> = {};
                try {
                  if (contact.customFields) currentFields = JSON.parse(contact.customFields);
                } catch {}
                currentFields[step.fieldKey] = this.formatVariables(step.fieldValue || "", contact);
                await prisma.contacts.update({
                  where: { id: contact.id },
                  data: { customFields: JSON.stringify(currentFields) },
                });
              }
            }
          } else if (reactive.actionType === "ADD_CLUSTER" && config.clusterId) {
            const targetClusterId = Number(config.clusterId);
            await prisma.contactClusterRelation.upsert({
              where: {
                contactId_clusterId: { contactId: contact.id, clusterId: targetClusterId },
              },
              create: { contactId: contact.id, clusterId: targetClusterId },
              update: {},
            });
            await prisma.contacts.update({
              where: { id: contact.id },
              data: { clusterId: targetClusterId },
            });
          }
        } catch (err) {
          console.error("Error executing reactive flow blocks:", err);
        }
      }
    };

    if (delayMs > 0) {
      setTimeout(executeResponses, delayMs);
    } else {
      await executeResponses();
    }
  }

  /**
   * Substitui tags dinâmicas padrão ({nome}, {telefone}) e qualquer campo chave-valor customizado ({empresa}, {cargo}, etc.)
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
        const fields = typeof contact.customFields === "string" ? JSON.parse(contact.customFields) : contact.customFields;
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

import { prisma } from "../prisma.client";
import { WhatsAppManager } from "../wpp/whatsapp.manager";
import { LoggerService } from "../services/logger.service";
import { ActionEngine } from "./action-engine";

export class SchedulerService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Inicia o serviço de verificação periódica de gatilhos
   */
  static start(intervalMs = 60000) {
    if (this.intervalId) return;

    console.log("[SchedulerService] Iniciando motor de agendamento de gatilhos...");
    // Executa a primeira checagem após 5 segundos
    setTimeout(() => this.tick(), 5000);
    this.intervalId = setInterval(() => this.tick(), intervalMs);
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[SchedulerService] Motor de agendamento parado.");
    }
  }

  /**
   * Ciclo de checagem de gatilhos ativos
   */
  private static async tick() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // Busca todos os gatilhos programados ativos
      const triggers = await prisma.trigger.findMany({
        where: {
          kind: "SCHEDULED",
          active: true,
        },
        include: {
          TemporalCondition: true,
          TriggerClusterRelation: {
            include: {
              TriggerCluster: true,
            },
          },
          ResponseTriggerRelation: {
            include: {
              Response: true,
            },
          },
        },
      });

      for (const trigger of triggers) {
        // Verifica se o usuário possui sessão ativa de WhatsApp
        const session = WhatsAppManager.getSession(trigger.userId);
        if (!session || session.status !== "CONNECTED") continue;

        const condition = trigger.TemporalCondition;
        if (!condition) continue;

        // Caso 1: Horário Diário Recorrente (RECURRING_DAILY ou SPECIFIC_TIME)
        if (
          (condition.type === "RECURRING_DAILY" || condition.type === "SPECIFIC_TIME") &&
          condition.targetTime === currentTimeStr
        ) {
          await this.executeScheduledTrigger(trigger, session.userId);
        }

        // Caso 2: Inatividade de Contatos (ex: 7 dias sem mensagem)
        if (condition.type === "INACTIVITY_DAYS" && condition.inactivityDays && condition.inactivityDays > 0) {
          await this.executeInactivityTrigger(trigger, condition.inactivityDays, session.userId);
        }
      }
    } catch (err) {
      console.error("[SchedulerService] Erro durante ciclo do scheduler:", err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Executa gatilho agendado para o público-alvo (cluster ou todos os contatos)
   */
  private static async executeScheduledTrigger(trigger: any, userId: string) {
    let contacts = [];

    if (trigger.TriggerClusterRelation.length > 0) {
      const targetClusterIds = trigger.TriggerClusterRelation.map((r: any) => r.triggerClusterId);
      contacts = await prisma.contacts.findMany({
        where: {
          userId,
          clusterId: { in: targetClusterIds },
        },
      });
    } else {
      contacts = await prisma.contacts.findMany({
        where: { userId },
      });
    }

    if (contacts.length === 0) return;

    for (const contact of contacts) {
      for (const rel of trigger.ResponseTriggerRelation) {
        const response = rel.Response;
        if (!response || !response.content) continue;

        const text = ActionEngine.formatVariables(response.content, contact);
        try {
          await WhatsAppManager.sendMessage(userId, contact.phone, text);

          await LoggerService.log({
            userId,
            eventType: "TRIGGER_EXECUTED",
            contactPhone: contact.phone,
            contactName: contact.name,
            automationType: "TRIGGER",
            automationId: trigger.id,
            description: `Gatilho "${trigger.name}" executado para ${contact.name}.`,
          });
        } catch (err) {
          console.error(`Erro ao disparar gatilho para ${contact.phone}:`, err);
        }
      }
    }

    await prisma.trigger.update({
      where: { id: trigger.id },
      data: { usageCount: { increment: contacts.length } },
    });
  }

  /**
   * Executa gatilho para contatos inativos há X dias
   */
  private static async executeInactivityTrigger(trigger: any, days: number, userId: string) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const inactiveContacts = await prisma.contacts.findMany({
      where: {
        userId,
        lastInteraction: {
          lt: cutoffDate,
        },
      },
      take: 20, // processa em lotes seguros
    });

    for (const contact of inactiveContacts) {
      for (const rel of trigger.ResponseTriggerRelation) {
        const response = rel.Response;
        if (!response || !response.content) continue;

        const text = ActionEngine.formatVariables(response.content, contact);
        try {
          await WhatsAppManager.sendMessage(userId, contact.phone, text);

          // Atualiza última interação para evitar re-envio contínuo
          await prisma.contacts.update({
            where: { id: contact.id },
            data: { lastInteraction: new Date() },
          });

          await LoggerService.log({
            userId,
            eventType: "TRIGGER_EXECUTED",
            contactPhone: contact.phone,
            contactName: contact.name,
            automationType: "TRIGGER",
            automationId: trigger.id,
            description: `Gatilho de inatividade "${trigger.name}" disparado para ${contact.name}.`,
          });
        } catch (err) {
          console.error(`Erro ao disparar gatilho de inatividade:`, err);
        }
      }
    }
  }
}

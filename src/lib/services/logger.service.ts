import { prisma } from "../prisma.client";

export type EventType =
  | "WPP_CONNECT"
  | "WPP_DISCONNECT"
  | "WPP_RECONNECTING"
  | "WPP_QR"
  | "MSG_RECEIVED"
  | "MSG_SENT"
  | "CONTACT_CREATED"
  | "CONTACT_UPDATED"
  | "CLUSTER_CREATED"
  | "CLUSTER_UPDATED"
  | "CLUSTER_DELETED"
  | "CONTACT_ADDED_TO_CLUSTER"
  | "CONTACT_REMOVED_FROM_CLUSTER"
  | "REACTIVE_TRIGGERED"
  | "TRIGGER_EXECUTED"
  | "FLOW_STARTED"
  | "FLOW_COMPLETED"
  | "ACTION_EXECUTED"
  | "ERROR";

export type AutomationType = "REACTIVE" | "TRIGGER" | "MANUAL" | "SYSTEM";
export type LogStatus = "SUCCESS" | "ERROR" | "INFO" | "WARNING";

export interface CreateLogDTO {
  userId: string;
  eventType: EventType;
  description: string;
  contactPhone?: string;
  contactName?: string;
  automationType?: AutomationType;
  automationId?: number;
  status?: LogStatus;
  metadata?: Record<string, any>;
}

export class LoggerService {
  static async log(data: CreateLogDTO) {
    try {
      return await prisma.activityLog.create({
        data: {
          userId: data.userId,
          eventType: data.eventType,
          description: data.description,
          contactPhone: data.contactPhone,
          contactName: data.contactName,
          automationType: data.automationType ?? "SYSTEM",
          automationId: data.automationId,
          status: data.status ?? "SUCCESS",
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });
    } catch (err) {
      console.error("Failed to write activity log to database:", err);
    }
  }

  static async getRecentLogs(userId: string, limit = 50) {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

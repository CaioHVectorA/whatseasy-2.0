import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { prisma } from "@/lib/prisma.client";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { AppError } from "@/lib/appError";
import { LoggerService } from "@/lib/services/logger.service";

export interface CanvasNode {
  id: string;
  type: "trigger" | "message" | "menu" | "delay" | "action" | "condition";
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface FlowPayload {
  name: string;
  active?: boolean;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  triggerKeywords?: string[];
  triggerType?: "EQUALS" | "CONTAINS" | "STARTS_WITH" | "REGEX";
}

export const flowsController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Listar todos os fluxos do Canvas
  fastify.get("/flows", async (req, reply) => {
    const userId = (req.user as { id: string }).id;

    const flows = await prisma.trigger.findMany({
      where: {
        userId,
        kind: { in: ["CANVAS_FLOW", "REACTIVE"] },
      },
      include: {
        TextTrigger: true,
        TriggerClusterRelation: {
          include: { TriggerCluster: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const parsed = flows.map((f) => {
      let config: any = {};
      try {
        if (f.actionConfig) {
          config = typeof f.actionConfig === "string" ? JSON.parse(f.actionConfig) : f.actionConfig;
        }
      } catch {}

      return {
        id: f.id,
        name: f.name,
        active: f.active,
        kind: f.kind,
        usageCount: f.usageCount,
        nodes: config.nodes || [],
        edges: config.edges || [],
        textTriggers: f.TextTrigger.map((t) => ({ id: t.id, text: t.text, type: t.type })),
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      };
    });

    return mountApiResponse(parsed);
  });

  // Obter detalhes de um fluxo específico
  fastify.get<{ Params: { id: string } }>("/flows/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const flowId = Number(req.params.id);

    const flow = await prisma.trigger.findFirst({
      where: { id: flowId, userId },
      include: { TextTrigger: true },
    });

    if (!flow) {
      throw new AppError("Fluxo não encontrado.", 404);
    }

    let config: any = {};
    try {
      if (flow.actionConfig) {
        config = typeof flow.actionConfig === "string" ? JSON.parse(flow.actionConfig) : flow.actionConfig;
      }
    } catch {}

    return mountApiResponse({
      id: flow.id,
      name: flow.name,
      active: flow.active,
      nodes: config.nodes || [],
      edges: config.edges || [],
      textTriggers: flow.TextTrigger,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    });
  });

  // Criar novo fluxo Canvas
  fastify.post<{ Body: FlowPayload }>("/flows", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const { name, active = true, nodes = [], edges = [], triggerKeywords = ["olá", "menu"], triggerType = "CONTAINS" } = req.body || {};

    if (!name || !name.trim()) {
      throw new AppError("O nome do fluxo é obrigatório.", 400);
    }

    // Constrói steps lineares e menu para compatibilidade com o motor de execução
    const executionSteps: any[] = [];
    let menuConfig: any = null;

    nodes.forEach((node) => {
      if (node.type === "message" && node.data?.content) {
        executionSteps.push({
          type: "SEND_MESSAGE",
          content: node.data.content,
          mediaUrl: node.data.mediaUrl,
          mediaType: node.data.mediaType,
        });
      } else if (node.type === "delay" && node.data?.seconds) {
        executionSteps.push({
          type: "DELAY",
          delaySeconds: Number(node.data.seconds),
        });
      } else if (node.type === "menu" && Array.isArray(node.data?.options)) {
        menuConfig = {
          title: node.data.title || "Menu de Opções",
          options: node.data.options,
          footer: node.data.footer,
          fallbackMessage: node.data.fallbackMessage,
        };
      } else if (node.type === "action") {
        if (node.data?.actionType === "ADD_CLUSTER" && node.data.clusterId) {
          executionSteps.push({
            type: "ADD_CLUSTER",
            clusterId: node.data.clusterId,
          });
        } else if (node.data?.actionType === "UPDATE_FIELD" && node.data.fieldKey) {
          executionSteps.push({
            type: "UPDATE_FIELD",
            fieldKey: node.data.fieldKey,
            fieldValue: node.data.fieldValue,
          });
        }
      }
    });

    const actionConfig = {
      nodes,
      edges,
      steps: executionSteps,
      ...(menuConfig ? { menu: menuConfig } : {}),
    };

    const flow = await prisma.trigger.create({
      data: {
        name,
        active,
        userId,
        kind: "CANVAS_FLOW",
        actionType: "CANVAS",
        actionConfig: JSON.stringify(actionConfig),
        TextTrigger: {
          create: triggerKeywords.map((kw) => ({
            text: kw,
            type: triggerType,
          })),
        },
      },
    });

    await LoggerService.log({
      userId,
      eventType: "REACTIVE_TRIGGERED",
      description: `Fluxo Canvas "${name}" criado com sucesso.`,
    });

    return mountApiResponse(flow, "Fluxo Canvas criado com sucesso!");
  });

  // Atualizar fluxo Canvas
  fastify.put<{ Params: { id: string }; Body: FlowPayload }>("/flows/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const flowId = Number(req.params.id);
    const { name, active, nodes = [], edges = [], triggerKeywords, triggerType = "CONTAINS" } = req.body || {};

    const existing = await prisma.trigger.findFirst({ where: { id: flowId, userId } });
    if (!existing) throw new AppError("Fluxo não encontrado.", 404);

    // Converte os nós para steps de execução compatíveis com o ActionEngine
    const executionSteps: any[] = [];
    let menuConfig: any = null;

    nodes.forEach((node) => {
      if (node.type === "message" && node.data?.content) {
        executionSteps.push({
          type: "SEND_MESSAGE",
          content: node.data.content,
          mediaUrl: node.data.mediaUrl,
          mediaType: node.data.mediaType,
        });
      } else if (node.type === "delay" && node.data?.seconds) {
        executionSteps.push({
          type: "DELAY",
          delaySeconds: Number(node.data.seconds),
        });
      } else if (node.type === "menu" && Array.isArray(node.data?.options)) {
        menuConfig = {
          title: node.data.title || "Menu de Opções",
          options: node.data.options,
          footer: node.data.footer,
          fallbackMessage: node.data.fallbackMessage,
        };
      } else if (node.type === "action") {
        if (node.data?.actionType === "ADD_CLUSTER" && node.data.clusterId) {
          executionSteps.push({
            type: "ADD_CLUSTER",
            clusterId: node.data.clusterId,
          });
        } else if (node.data?.actionType === "UPDATE_FIELD" && node.data.fieldKey) {
          executionSteps.push({
            type: "UPDATE_FIELD",
            fieldKey: node.data.fieldKey,
            fieldValue: node.data.fieldValue,
          });
        }
      }
    });

    const actionConfig = {
      nodes,
      edges,
      steps: executionSteps,
      ...(menuConfig ? { menu: menuConfig } : {}),
    };

    const updated = await prisma.trigger.update({
      where: { id: flowId },
      data: {
        name: name || existing.name,
        active: active !== undefined ? active : existing.active,
        actionConfig: JSON.stringify(actionConfig),
      },
    });

    if (Array.isArray(triggerKeywords) && triggerKeywords.length > 0) {
      await prisma.textTrigger.deleteMany({ where: { triggerId: flowId } });
      await prisma.textTrigger.createMany({
        data: triggerKeywords.map((kw) => ({
          triggerId: flowId,
          text: kw,
          type: triggerType,
        })),
      });
    }

    return mountApiResponse(updated, "Fluxo Canvas atualizado com sucesso!");
  });

  // Excluir fluxo Canvas
  fastify.delete<{ Params: { id: string } }>("/flows/:id", async (req, reply) => {
    const userId = (req.user as { id: string }).id;
    const flowId = Number(req.params.id);

    await prisma.trigger.deleteMany({
      where: { id: flowId, userId },
    });

    return mountApiResponse({}, "Fluxo excluído com sucesso!");
  });
};

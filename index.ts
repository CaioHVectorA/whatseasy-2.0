import Fastify from "fastify";
import websocket from "@fastify/websocket";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import { AppError } from "@/lib/appError";
import { authController } from "@/controllers/auth.controller";
import { userController } from "@/controllers/user.controller";
import { contactsController } from "@/controllers/contacts.controller";
import { reactiveController } from "@/controllers/reactives.controller";
import { triggersController } from "@/controllers/triggers.controller";
import { logsController } from "@/controllers/logs.controller";
import { whatsappController } from "@/controllers/whatsapp.controller";
import { WhatsAppManager } from "@/lib/wpp/whatsapp.manager";
import { SchedulerService } from "@/lib/engine/scheduler";

async function bootstrap() {
  const fastify = Fastify({
    logger: false,
  });

  // Registrar CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Registrar JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "whatseasy_jwt_secret_dev_key_2026",
  });

  // Registrar WebSocket
  await fastify.register(websocket);

  // Parser permissivo para requisições POST sem corpo ou com outros content-types
  fastify.addContentTypeParser(
    ["application/x-www-form-urlencoded", "text/plain"],
    { parseAs: "string" },
    (req, body, done) => {
      done(null, {});
    }
  );

  // Tratamento global de erros
  fastify.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status: error.status,
        statusCode: error.statusCode,
        message: error.message,
        isOperational: true,
      });
    }

    if (error.statusCode === 401) {
      return reply.status(401).send({
        status: "fail",
        statusCode: 401,
        message: "Não autenticado ou sessão expirada.",
        isOperational: true,
      });
    }

    console.error("Unhandled Server Error:", error);
    return reply.status(error.statusCode || 500).send({
      status: "error",
      statusCode: error.statusCode || 500,
      message: error.message || "Erro interno do servidor",
      isOperational: false,
    });
  });

  // Proteção de rotas com JWT
  fastify.addHook("onRequest", async (request, reply) => {
    // Permite CORS Preflight (OPTIONS) sem verificação de token
    if (request.method === "OPTIONS") {
      return;
    }

    // Ignora rotas públicas de autenticação, health check e WebSocket
    if (
      request.url.startsWith("/auth") ||
      request.url === "/" ||
      request.url.startsWith("/ws")
    ) {
      return;
    }

    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({
        status: "fail",
        statusCode: 401,
        message: "Acesso não autorizado. Faça login novamente.",
      });
    }
  });

  // Health check
  fastify.get("/", async () => {
    return { status: "online", app: "WhatsEasy 2.0 API", version: "2.0.0" };
  });

  // Canal WebSocket para comunicação em tempo real
  fastify.register(async function (wsServer) {
    wsServer.get("/ws", { websocket: true }, (socket, req) => {
      const url = new URL(req.url, "http://localhost");
      const token = url.searchParams.get("token");

      let userId: string | null = null;

      if (token) {
        try {
          const decoded = fastify.jwt.verify<{ id: string }>(token);
          userId = decoded.id;
          WhatsAppManager.registerWs(userId, socket as any);
        } catch (err) {
          socket.send(JSON.stringify({ event: "ERROR", message: "Token inválido no WebSocket" }));
        }
      }

      socket.on("message", async (data) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.token && !userId) {
            const decoded = fastify.jwt.verify<{ id: string }>(payload.token);
            userId = decoded.id;
            WhatsAppManager.registerWs(userId, socket as any);
          }

          if (payload.action === "CONNECT" && userId) {
            await WhatsAppManager.startConnection(userId);
          }

          if (payload.action === "LOGOUT" && userId) {
            await WhatsAppManager.logoutSession(userId);
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      });
    });
  });

  // Registrar Controllers
  fastify.register(authController, { prefix: "/auth" });
  fastify.register(userController);
  fastify.register(whatsappController);
  fastify.register(contactsController);
  fastify.register(reactiveController);
  fastify.register(triggersController);
  fastify.register(logsController);

  const port = Number(process.env.PORT || 3333);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await fastify.listen({ port, host });
    console.log(`[WhatsEasy Server] Rodando com sucesso em http://localhost:${port}`);

    // Iniciar recuperação de sessões Baileys e Scheduler em segundo plano
    await WhatsAppManager.restoreSavedSessions();
    SchedulerService.start();
  } catch (err) {
    console.error("Erro ao iniciar o servidor Fastify:", err);
    process.exit(1);
  }
}

bootstrap();

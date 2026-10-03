import { buildApp } from "@/app";
import { WhatsAppManager } from "@/lib/wpp/whatsapp.manager";
import { SchedulerService } from "@/lib/engine/scheduler";

async function bootstrap() {
  const fastify = buildApp();
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

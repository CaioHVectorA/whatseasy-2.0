import { describe, it, expect, beforeEach } from "vitest";
import { ActionEngine } from "../../src/lib/engine/action-engine";
import { PlaygroundSimulatorAdapter } from "../../src/lib/engine/playground.adapter";
import { ConversationStateManager } from "../../src/lib/engine/conversation-state";

describe("Canvas Flow & Decoupled Engine Unit Tests", () => {
  const userId = "flow-test-user";
  const contactPhone = "5511999998888";

  beforeEach(() => {
    PlaygroundSimulatorAdapter.resetSession(userId);
    ConversationStateManager.clearSession(userId, contactPhone);
  });

  it("should execute message step and interpolate contact tags over simulator channel", async () => {
    const adapter = new PlaygroundSimulatorAdapter(userId);
    const contact = {
      id: 999999,
      name: "Mariana Souza",
      phone: contactPhone,
      customFields: {
        empresa: "Tech Solutions",
      },
    };

    const mockReactive = {
      id: 50,
      name: "Boas-Vindas",
      actionConfig: JSON.stringify({
        steps: [
          {
            type: "SEND_MESSAGE",
            content: "Olá {primeiro_nome} da empresa {empresa}! Bem-vinda.",
          },
        ],
      }),
    };

    await ActionEngine.executeReactiveActions(
      mockReactive,
      contact,
      contactPhone,
      adapter,
      userId
    );

    const session = PlaygroundSimulatorAdapter.getSession(userId);
    expect(session.messages.length).toBe(1);
    expect(session.messages[0].sender).toBe("bot");
    expect(session.messages[0].text).toBe("Olá Mariana da empresa Tech Solutions! Bem-vinda.");
  });

  it("should trigger interactive menu and transition state machine to waitingInput", async () => {
    const adapter = new PlaygroundSimulatorAdapter(userId);
    const contact = {
      id: 999999,
      name: "Rodrigo Costa",
      phone: contactPhone,
      customFields: {},
    };

    const mockReactive = {
      id: 51,
      name: "Menu Principal",
      actionConfig: JSON.stringify({
        menu: {
          title: "Atendimento Rápido",
          options: [
            { key: "1", label: "Quero Comprar", targetClusterId: 2 },
            { key: "2", label: "Dúvidas Técnicas" },
          ],
          footer: "Digite 1 ou 2:",
        },
      }),
    };

    await ActionEngine.executeReactiveActions(
      mockReactive,
      contact,
      contactPhone,
      adapter,
      userId
    );

    // 1. Mensagem de menu enviada para o simulador
    const session = PlaygroundSimulatorAdapter.getSession(userId);
    expect(session.messages.length).toBe(1);
    expect(session.messages[0].text).toContain("*Atendimento Rápido*");
    expect(session.messages[0].text).toContain("1️⃣ Quero Comprar");
    expect(session.messages[0].text).toContain("2️⃣ Dúvidas Técnicas");

    // 2. Máquina de estados agora está aguardando resposta
    const convState = ConversationStateManager.getSession(userId, contactPhone);
    expect(convState).not.toBeNull();
    expect(convState?.waitingInput).toBe(true);
    expect(convState?.validationType).toBe("OPTION");
    expect(convState?.validOptions.length).toBe(2);
  });
});

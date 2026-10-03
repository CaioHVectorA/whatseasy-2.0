import { describe, it, expect, beforeEach } from "vitest";
import { PlaygroundSimulatorAdapter } from "../../src/lib/engine/playground.adapter";

describe("PlaygroundSimulatorAdapter Unit Tests", () => {
  const userId = "sim-user-1";

  beforeEach(() => {
    PlaygroundSimulatorAdapter.resetSession(userId);
  });

  it("should initialize with default test contact and empty messages", () => {
    const session = PlaygroundSimulatorAdapter.getSession(userId);
    expect(session).toBeDefined();
    expect(session.contact.name).toBe("Lead de Teste");
    expect(session.messages.length).toBe(0);
    expect(session.executedActions.length).toBe(0);
  });

  it("should record incoming lead message and outgoing bot message", async () => {
    const adapter = new PlaygroundSimulatorAdapter(userId);

    // 1. Lead envia mensagem
    adapter.recordIncomingMessage("Olá, quanto custa?");
    let session = PlaygroundSimulatorAdapter.getSession(userId);
    expect(session.messages.length).toBe(1);
    expect(session.messages[0].sender).toBe("contact");
    expect(session.messages[0].text).toBe("Olá, quanto custa?");

    // 2. Bot responde via adapter
    await adapter.sendMessage("5511999998888", { text: "O plano custa R$ 99/mês." });
    session = PlaygroundSimulatorAdapter.getSession(userId);
    expect(session.messages.length).toBe(2);
    expect(session.messages[1].sender).toBe("bot");
    expect(session.messages[1].text).toBe("O plano custa R$ 99/mês.");
    expect(session.executedActions.length).toBe(1);
  });

  it("should update simulated contact custom fields", () => {
    PlaygroundSimulatorAdapter.updateContact(userId, {
      name: "Carlos Santos",
      customFields: {
        cargo: "Gerente de TI",
        plano_interesse: "Enterprise",
      },
    });

    const session = PlaygroundSimulatorAdapter.getSession(userId);
    expect(session.contact.name).toBe("Carlos Santos");
    expect(session.contact.customFields.cargo).toBe("Gerente de TI");
    expect(session.contact.customFields.plano_interesse).toBe("Enterprise");
  });

  it("should reset session properly", () => {
    const adapter = new PlaygroundSimulatorAdapter(userId);
    adapter.recordIncomingMessage("Teste");
    expect(PlaygroundSimulatorAdapter.getSession(userId).messages.length).toBe(1);

    PlaygroundSimulatorAdapter.resetSession(userId);
    expect(PlaygroundSimulatorAdapter.getSession(userId).messages.length).toBe(0);
  });
});

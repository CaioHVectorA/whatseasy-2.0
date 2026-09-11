import { describe, it, expect, beforeEach } from "vitest";
import {
  ConversationStateManager,
  type ConversationSession,
} from "../../src/lib/engine/conversation-state";

describe("ConversationStateManager Unit Tests", () => {
  const userId = "test-user-1";
  const phone = "5511999998888";

  beforeEach(() => {
    ConversationStateManager.clearSession(userId, phone);
  });

  it("should create and retrieve a conversation session", () => {
    ConversationStateManager.setSession(userId, phone, {
      flowId: 10,
      stepNumber: 1,
      waitingInput: true,
      validationType: "OPTION",
      validOptions: [
        { key: "1", label: "Vendas" },
        { key: "2", label: "Suporte" },
      ],
    });

    const session = ConversationStateManager.getSession(userId, phone);
    expect(session).not.toBeNull();
    expect(session?.flowId).toBe(10);
    expect(session?.waitingInput).toBe(true);
    expect(session?.validOptions.length).toBe(2);
  });

  it("should format menu text with numbers and emojis cleanly", () => {
    const options = [
      { key: "1", label: "Comprar produto" },
      { key: "2", label: "Falar com atendente" },
    ];

    const formatted = ConversationStateManager.formatMenuText("Menu Inicial", options);
    expect(formatted).toContain("*Menu Inicial*");
    expect(formatted).toContain("1️⃣ Comprar produto");
    expect(formatted).toContain("2️⃣ Falar com atendente");
    expect(formatted).toContain("Digite o número da opção desejada:");
  });

  it("should validate valid menu input by option number or text", () => {
    const session: ConversationSession = {
      userId,
      contactPhone: phone,
      stepNumber: 1,
      waitingInput: true,
      validationType: "OPTION",
      validOptions: [
        { key: "1", label: "Planos" },
        { key: "2", label: "Suporte" },
      ],
      variables: {},
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    };

    // Pelo número "1"
    const result1 = ConversationStateManager.validateInput(session, "1");
    expect(result1.isValid).toBe(true);
    expect(result1.matchedOption?.label).toBe("Planos");

    // Pelo texto "planos"
    const result2 = ConversationStateManager.validateInput(session, "planos");
    expect(result2.isValid).toBe(true);
    expect(result2.matchedOption?.label).toBe("Planos");

    // Opção inválida
    const resultInvalid = ConversationStateManager.validateInput(session, "99");
    expect(resultInvalid.isValid).toBe(false);
    expect(resultInvalid.errorFeedback).toBeDefined();
  });

  it("should validate email inputs properly", () => {
    const session: ConversationSession = {
      userId,
      contactPhone: phone,
      stepNumber: 1,
      waitingInput: true,
      validationType: "EMAIL",
      validOptions: [],
      variables: {},
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    };

    expect(ConversationStateManager.validateInput(session, "contato@empresa.com").isValid).toBe(true);
    expect(ConversationStateManager.validateInput(session, "invalido_sem_arroba").isValid).toBe(false);
  });

  it("should clear session on demand", () => {
    ConversationStateManager.setSession(userId, phone, {
      waitingInput: true,
    });

    expect(ConversationStateManager.getSession(userId, phone)).not.toBeNull();
    ConversationStateManager.clearSession(userId, phone);
    expect(ConversationStateManager.getSession(userId, phone)).toBeNull();
  });
});

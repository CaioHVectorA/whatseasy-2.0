import { describe, it, expect } from "vitest";
import { ActionEngine } from "../../src/lib/engine/action-engine";

describe("ActionEngine Unit Tests", () => {
  it("should replace dynamic variables {nome} and {telefone} properly", () => {
    const template = "Olá {nome}! Seu telefone é {telefone}.";
    const contact = {
      id: 1,
      name: "João Silva",
      phone: "5521999998888",
      userId: "user-123",
      clusterId: null,
      lastInteraction: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = ActionEngine.formatVariables(template, contact);
    expect(result).toBe("Olá João Silva! Seu telefone é 5521999998888.");
  });

  it("should fallback to 'Cliente' if contact name is empty", () => {
    const template = "Olá {nome}!";
    const contact = {
      id: 2,
      name: "",
      phone: "5521999998888",
      userId: "user-123",
      clusterId: null,
      lastInteraction: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = ActionEngine.formatVariables(template, contact);
    expect(result).toBe("Olá Cliente!");
  });
});

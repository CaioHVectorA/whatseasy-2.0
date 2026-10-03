import { describe, it, expect } from "vitest";

function testTextCondition(
  type: "EQUALS" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "REGEX",
  pattern: string,
  incomingText: string
): boolean {
  const cleanIncoming = incomingText.trim().toLowerCase();
  const cleanPattern = pattern.trim().toLowerCase();

  switch (type) {
    case "EQUALS":
      return cleanIncoming === cleanPattern;
    case "CONTAINS":
      return cleanIncoming.includes(cleanPattern);
    case "STARTS_WITH":
      return cleanIncoming.startsWith(cleanPattern);
    case "ENDS_WITH":
      return cleanIncoming.endsWith(cleanPattern);
    case "REGEX":
      try {
        return new RegExp(pattern, "i").test(incomingText);
      } catch {
        return false;
      }
  }
}

describe("Text Trigger Matching Rules", () => {
  it("EQUALS matches exact text ignoring case", () => {
    expect(testTextCondition("EQUALS", "preço", "PREÇO")).toBe(true);
    expect(testTextCondition("EQUALS", "preço", "qual o preço")).toBe(false);
  });

  it("CONTAINS matches substring anywhere in the message", () => {
    expect(testTextCondition("CONTAINS", "suporte", "Olá, preciso de suporte técnico por favor")).toBe(true);
    expect(testTextCondition("CONTAINS", "vendas", "Quero falar com suporte")).toBe(false);
  });

  it("STARTS_WITH matches prefix correctly", () => {
    expect(testTextCondition("STARTS_WITH", "bom dia", "Bom dia! Tudo bem?")).toBe(true);
    expect(testTextCondition("STARTS_WITH", "bom dia", "Olá, bom dia!")).toBe(false);
  });

  it("ENDS_WITH matches suffix correctly", () => {
    expect(testTextCondition("ENDS_WITH", "comprar", "Quero comprar")).toBe(true);
    expect(testTextCondition("ENDS_WITH", "comprar", "Comprar agora mesmo")).toBe(false);
  });

  it("REGEX matches custom patterns", () => {
    expect(testTextCondition("REGEX", "pedido\\s*#?\\d+", "Meu pedido #12345 chegou")).toBe(true);
    expect(testTextCondition("REGEX", "pedido\\s*#?\\d+", "Nenhum número aqui")).toBe(false);
  });
});

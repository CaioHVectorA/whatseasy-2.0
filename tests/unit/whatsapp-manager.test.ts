import { describe, it, expect } from "vitest";
import BaileysModule from "@whiskeysockets/baileys";
import { WhatsAppManager } from "../../src/lib/wpp/whatsapp.manager";

describe("WhatsApp Integration Unit Tests", () => {
  it("should correctly resolve makeWASocket as a callable function from Baileys", () => {
    const makeWASocket = (
      typeof BaileysModule === "function"
        ? BaileysModule
        : (BaileysModule as any)?.default || (BaileysModule as any)?.makeWASocket || BaileysModule
    );

    expect(typeof makeWASocket).toBe("function");
  });

  it("should have clean session management methods", () => {
    expect(typeof WhatsAppManager.startConnection).toBe("function");
    expect(typeof WhatsAppManager.getSession).toBe("function");
    expect(typeof WhatsAppManager.logoutSession).toBe("function");
    expect(typeof WhatsAppManager.sendMessage).toBe("function");
  });
});

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
    expect(typeof WhatsAppManager.getDiagnostics).toBe("function");
  });

  it("should return the configured or default auths directory and user folder", () => {
    const authsDir = WhatsAppManager.getAuthsDir();
    expect(authsDir).toBeDefined();
    expect(typeof authsDir).toBe("string");

    const userFolder = WhatsAppManager.getUserAuthFolder("user-123");
    expect(userFolder).toContain("user-123");
  });

  it("should provide diagnostic data with active session counts", () => {
    const diagnostics = WhatsAppManager.getDiagnostics();
    expect(diagnostics).toHaveProperty("activeSessionCount");
    expect(diagnostics).toHaveProperty("sessions");
    expect(Array.isArray(diagnostics.sessions)).toBe(true);
  });
});

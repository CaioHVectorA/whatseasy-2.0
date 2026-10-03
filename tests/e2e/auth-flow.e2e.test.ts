import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "@/app";
import { prisma } from "@/lib/prisma.client";
import type { FastifyInstance } from "fastify";

describe("E2E QA Suite: Authentication & Security Boundary", () => {
  let app: FastifyInstance;
  const testUserEmail = `qa_auth_${Date.now()}@whatseasy.test`;
  const testPassword = "StrongPassword123!";
  let authToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany({ where: { User: { email: testUserEmail } } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    });
    await app.close();
  });

  describe("Pessimistic Registration Validations", () => {
    it("should reject registration with empty body", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.status).toBe("fail");
      expect(json.message).toContain("obrigatórios");
    });

    it("should reject registration with short password (< 6 chars)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Test QA",
          email: "qa_short_pass@whatseasy.test",
          password: "123",
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.message).toContain("no mínimo 6 caracteres");
    });

    it("should successfully register a valid new user and return JWT", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "QA Super User",
          email: testUserEmail,
          password: testPassword,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.data.token).toBeDefined();
      expect(json.data.user.email).toBe(testUserEmail);
      authToken = json.data.token;
    });

    it("should reject duplicate registration with the same email with 409 Conflict", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "QA Duplicate User",
          email: testUserEmail,
          password: testPassword,
        },
      });

      expect(res.statusCode).toBe(409);
      const json = res.json();
      expect(json.status).toBe("fail");
      expect(json.message).toContain("Já existe um usuário");
    });
  });

  describe("Pessimistic Login Validations", () => {
    it("should reject login with wrong password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: testUserEmail,
          password: "IncorrectPassword!",
        },
      });

      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.status).toBe("fail");
      expect(json.message).toContain("inválidos");
    });

    it("should reject login for non-existent user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "ghost_user_99999@whatseasy.test",
          password: "AnyPassword123!",
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it("should successfully log in and return token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: testUserEmail,
          password: testPassword,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.token).toBeDefined();
      expect(json.data.user.email).toBe(testUserEmail);
    });
  });

  describe("Security Boundaries & Protected Route Enforcement", () => {
    it("should deny access to /contacts without Authorization header", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/contacts",
      });

      expect(res.statusCode).toBe(401);
    });

    it("should deny access with malformed JWT token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/contacts",
        headers: {
          Authorization: "Bearer invalid.fake.token.123",
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it("should allow authenticated access to /auth/me", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.email).toBe(testUserEmail);
      expect(json.data.Client).toBeDefined();
    });

    it("should allow access to public /health without authentication", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.status).toBe("healthy");
      expect(json.database.connected).toBe(true);
    });
  });
});

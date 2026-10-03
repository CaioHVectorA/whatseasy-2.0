import { prisma } from "../lib/prisma.client";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { hash, compare } from "bcrypt";
import type { LoginRequest, RegisterRequest } from "../lib/types/dtos";
import type { Body } from "../lib/types/utils";
import { AppError } from "@/lib/appError";
import { mountApiResponse } from "@/lib/ws/mount-response";
import { LoggerService } from "@/lib/services/logger.service";

export const authController: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Registro com email, senha e nome
  fastify.post<Body<RegisterRequest>>("/register", async (req, reply) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new AppError("E-mail, senha e nome são obrigatórios!", 400);
    }

    if (password.length < 6) {
      throw new AppError("A senha deve ter no mínimo 6 caracteres.", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (userExists) {
      throw new AppError("Já existe um usuário cadastrado com este e-mail.", 409);
    }

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        Client: {
          create: {
            status: "DISCONNECTED",
            isConnected: false,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const token = fastify.jwt.sign({ id: user.id, email: user.email });

    await LoggerService.log({
      userId: user.id,
      eventType: "CONTACT_CREATED",
      description: `Conta criada para o usuário ${user.name} (${user.email}).`,
      status: "SUCCESS",
    });

    return reply.status(201).send(
      mountApiResponse(
        { token, user },
        "Cadastro realizado com sucesso!"
      )
    );
  });

  // Login com email e senha
  fastify.post<Body<LoginRequest>>("/login", async (req, reply) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("E-mail e senha são obrigatórios!", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        Client: true,
      },
    });

    if (!user || !user.password) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email });

    return mountApiResponse(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isConnected: user.Client?.isConnected ?? false,
          status: user.Client?.status ?? "DISCONNECTED",
        },
      },
      "Login realizado com sucesso!"
    );
  });

  // Dados do usuário logado
  fastify.get("/me", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new AppError("Não autenticado.", 401);
    }

    const jwtUser = req.user as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        Client: {
          select: {
            id: true,
            status: true,
            isConnected: true,
            phone: true,
            name: true,
            last_conn: true,
            last_sync: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    return mountApiResponse(user);
  });
};

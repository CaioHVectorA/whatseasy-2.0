import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.client";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { genSalt, hash, compare } from 'bcrypt';
import type { LoginRequest, RegisterRequest } from "../lib/types/dtos";
import type { Body } from "../lib/types/utils";
import { AppError } from '@/lib/appError';
export const authController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.post<Body<RegisterRequest>>('/auth/register', async (req, reply) => {
        const { email, password, name } = req.body;
        const salt = await genSalt(10);
        const hashedPassword = await hash(password, salt);
        if (await prisma.user.findUnique({ where: { email } })) {
            throw new AppError('Usuário já existe!');
        }
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });
        const token = fastify.jwt.sign({ id: user.id });
        return { token };
    });

    fastify.post<Body<LoginRequest>>('/auth/login', async (req, reply) => {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            throw new AppError('Usuário não encontrado. Tente um cadastro!');
        }
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Senha incorreta!');
        }
        const token = fastify.jwt.sign({ id: user.id });
        return { token };
    });
};
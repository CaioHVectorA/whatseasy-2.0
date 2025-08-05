import type { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.client';
import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { genSalt, hash, compare } from 'bcrypt';
import type { LoginRequest, RegisterRequest } from '../lib/types/dtos';
import type { Body } from '../lib/types/utils';
import { AppError } from '@/lib/appError';
import { mountApiResponse } from '@/lib/ws/mount-response';
import { resend, RESEND_EMAIL } from '@/lib/resend';
export const authController: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // fastify.post<Body<RegisterRequest>>('/auth/register', async (req, reply) => {
  //     const { email, password, name } = req.body;
  //     const salt = await genSalt(10);
  //     const hashedPassword = await hash(password, salt);
  //     if (await prisma.user.findUnique({ where: { email } })) {
  //         throw new AppError('Usuário já existe!');
  //     }
  //     const user = await prisma.user.create({
  //         data: {
  //             email,
  //             password: hashedPassword,
  //             name
  //         }
  //     });
  //     const token = fastify.jwt.sign({ id: user.id });
  //     return mountApiResponse({ token }, 'Registrado com sucesso!');
  // });

  // fastify.post<Body<LoginRequest>>('/auth/login', async (req, reply) => {
  //     const { email, password } = req.body;
  //     const user = await prisma.user.findUnique({
  //         where: { email }
  //     });
  //     if (!user) {
  //         throw new AppError('Usuário não encontrado. Tente um cadastro!');
  //     }
  //     const isPasswordValid = await compare(password, user.password);
  //     if (!isPasswordValid) {
  //         throw new AppError('Senha incorreta!');
  //     }
  //     const token = fastify.jwt.sign({ id: user.id });
  //     return mountApiResponse({ token }, 'Logado com sucesso!');
  // });
  fastify.post<Body<{ email: string }>>('/enter', async (req, reply) => {
    const { email } = req.body;
    const userExists = await prisma.user.findUnique({
      where: { email },
    });
    if (!userExists) {
      const user = await prisma.user.create({
        data: {
          email,
        },
      });
      const jwt = fastify.jwt.sign({ id: user.id });
      const { data, error } = await resend.emails.send({
        from: RESEND_EMAIL,
        to: email,
        subject: "Bem-vindo ao What's Easy",
        html: `
                Clique <a href="${process.env.CLIENT_URL}/auth/callback?token=${jwt}&new=true">aqui</a> para se cadastrar.
                `,
      });
      if (error) {
        console.log({ error });
        throw new AppError('Erro ao enviar e-mail');
      }
      return mountApiResponse({});
    }
    const jwt = fastify.jwt.sign({ id: userExists.id });
    const { data, error } = await resend.emails.send({
      from: RESEND_EMAIL,
      to: email,
      subject: "Bem-vindo de volta ao What's Easy",
      html: `
            Clique <a href="${process.env.CLIENT_URL}/auth/callback?token=${jwt}">aqui</a> para fazer login.
            `,
    });
    if (error) {
      console.log({ error });
      throw new AppError('Erro ao enviar e-mail');
    }
    return mountApiResponse({});
  });
  fastify.post<Body<{ email: string }>>('/enter-development', async (req, reply) => {
    const { email } = req.body;
    // if (process.env.npm_lifecycle_event && process.env.npm_lifecycle_event !== 'dev') {
    // throw new AppError('Rota disponível apenas em ambiente de desenvolvimento: ' + process.env.npm_lifecycle_event);
    // }
    const userExists = await prisma.user.findUnique({
      where: { email },
    });
    if (!userExists) {
      const user = await prisma.user.create({
        data: {
          email,
        },
      });
      const jwt = fastify.jwt.sign({ id: user.id });
      return mountApiResponse({ token: jwt }, 'Usuário criado com sucesso!');
    }
    const jwt = fastify.jwt.sign({ id: userExists.id });
    return mountApiResponse({ token: jwt }, 'Usuário encontrado com sucesso!');
  });
};

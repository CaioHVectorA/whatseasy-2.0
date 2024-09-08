import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.client";
import fastify from "fastify";
import { genSalt, compare } from 'bcrypt'
import type { RegisterRequest } from "../lib/types/dtos";
import type { Body } from "../lib/types/utils";

export const authController = fastify()
    .post<Body<RegisterRequest>>('/register', async (req) => {
        const { email, password, name } = req.body
        // const 
        const user = await prisma.user.create({
            data: {
                email,
                password,
                
            }
        })
        return user
    })
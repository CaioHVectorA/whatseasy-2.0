import { Resend } from "resend";
export const resend = new Resend(process.env.RESEND_API_KEY!);

export const RESEND_EMAIL = `Acme <onboarding@resend.dev>`;

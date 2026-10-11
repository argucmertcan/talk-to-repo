import nodemailer from "nodemailer";
import { config } from "../config";
import { renderTemplate } from "./templates";

const transport = nodemailer.createTransport(config.smtpUrl);

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `https://panel.kargo.example/sifre-sifirla?token=${token}`;
  await transport.sendMail({ to, subject: "Şifre sıfırlama", html: renderTemplate("reset", { link }) });
}

export async function sendInvoiceEmail(to: string, invoiceId: number) {
  await transport.sendMail({ to, subject: `Faturanız #${invoiceId}`, html: renderTemplate("invoice", { invoiceId }) });
}

// Envio de e-mail por SMTP (nodemailer). Quem configura é o painel (Integrações > E-mail).
import "server-only";
import nodemailer from "nodemailer";
import type { Mail } from "../newsletter";

export type SmtpConfig = { host: string; port: string; user: string; password: string; from: string };

function transport(cfg: SmtpConfig) {
  const port = Number(cfg.port);
  return nodemailer.createTransport({
    host: cfg.host,
    port,
    secure: port === 465,
    auth: { user: cfg.user, pass: cfg.password },
    // SMTP_INSECURE_TLS só existe para o servidor de mentira dos testes (sem certificado).
    tls: process.env.SMTP_INSECURE_TLS === "1" ? { rejectUnauthorized: false } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

export async function verifySmtp(cfg: SmtpConfig): Promise<void> {
  if (!Number.isInteger(Number(cfg.port)) || Number(cfg.port) < 1 || Number(cfg.port) > 65535) throw new Error("A porta precisa ser um número entre 1 e 65535.");
  await transport(cfg).verify();
}

/** Envia vários e-mails na mesma conexão. Devolve, por destinatário, se saiu. */
export async function sendMails(cfg: SmtpConfig, items: { to: string; mail: Mail; unsubscribeUrl?: string }[]): Promise<{ to: string; ok: boolean; error?: string }[]> {
  const t = transport(cfg);
  const out: { to: string; ok: boolean; error?: string }[] = [];
  for (const it of items) {
    try {
      await t.sendMail({
        from: cfg.from,
        to: it.to,
        subject: it.mail.subject,
        text: it.mail.text,
        html: it.mail.html,
        headers: it.unsubscribeUrl ? { "List-Unsubscribe": `<${it.unsubscribeUrl}>` } : undefined,
      });
      out.push({ to: it.to, ok: true });
    } catch (e) {
      out.push({ to: it.to, ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "falha" });
    }
  }
  t.close();
  return out;
}
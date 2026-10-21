// Boletim por e-mail: inscrição com confirmação, cancelamento sem login e o envio semanal. Só Supabase.
import "server-only";
import { randomBytes } from "node:crypto";
import { confirmationMail, digestMail, isValidEmail, normalizeEmail, NEWSLETTER_MAX_DEALS } from "../newsletter";
import { getIntegrationConfig } from "./integrations";
import { sendMails, type SmtpConfig } from "../integrations/smtp";
import { listFeedPage } from "./feed";
import { DEFAULT_BRAND, getSetting, type BrandSettings } from "./settings";
import { db } from "../supabase/db";

const SEND_BATCH = 100;
const MIN_DAYS_BETWEEN = 6;

type Row = { id: string; email: string; token: string; status: "pending" | "active" | "unsubscribed" };

const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const newToken = () => randomBytes(16).toString("hex");
const TOKEN_RE = /^[0-9a-f]{32}$/;
export const isToken = (t: unknown): t is string => typeof t === "string" && TOKEN_RE.test(t);

async function smtp(): Promise<SmtpConfig | null> {
  return getIntegrationConfig<SmtpConfig>("smtp");
}

let availability: { value: boolean; expires: number } | null = null;

/** O formulário do rodapé só aparece quando dá para cumprir a promessa: SMTP ligado e a tabela criada. Cache de 60 s. */
export async function newsletterAvailable(): Promise<boolean> {
  if (availability && availability.expires > Date.now()) return availability.value;
  let value = false;
  try {
    value = !!(await smtp()) && !(await db().from("newsletter_subscribers").select("id", { head: true, count: "exact" }).limit(1)).error;
  } catch {
    value = false;
  }
  availability = { value, expires: Date.now() + 60_000 };
  return value;
}

export type SubscribeResult = { ok: true } | { error: string };

/** Cria (ou reativa) a inscrição e manda o e-mail de confirmação. A resposta é a mesma para e-mail novo e já inscrito. */
export async function subscribe(rawEmail: string, userId: string | null): Promise<SubscribeResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) return { error: "Esse e-mail não parece válido." };
  const cfg = await smtp();
  if (!cfg) return { error: "O boletim ainda não está disponível. Volte em breve." };

  const found = await db().from("newsletter_subscribers").select("id, email, token, status").eq("email", email).maybeSingle();
  if (found.error) return { error: "O boletim ainda não está disponível. Volte em breve." };
  let row = found.data as Row | null;
  if (row?.status === "active") return { ok: true }; // já recebe; não reenvia nada
  if (row) {
    const upd = await db().from("newsletter_subscribers").update({ status: "pending", token: newToken(), user_id: userId }).eq("id", row.id).select("id, email, token, status").single();
    if (upd.error) return { error: "Não conseguimos salvar agora. Tente de novo." };
    row = upd.data as Row;
  } else {
    const ins = await db().from("newsletter_subscribers").insert({ email, token: newToken(), user_id: userId }).select("id, email, token, status").single();
    if (ins.error) return { error: "Não conseguimos salvar agora. Tente de novo." };
    row = ins.data as Row;
  }
  const brand = await getSetting<BrandSettings>("public.brand", DEFAULT_BRAND);
  const mail = confirmationMail({ siteName: brand.siteName, confirmUrl: `${baseUrl()}/boletim/confirmar?t=${row.token}` });
  const [sent] = await sendMails(cfg, [{ to: email, mail }]);
  if (!sent.ok) {
    console.error("[boletim] confirmação não enviada", sent.error);
    return { error: "Não conseguimos enviar o e-mail de confirmação agora. Tente mais tarde." };
  }
  return { ok: true };
}

export async function findByToken(token: string): Promise<Row | null> {
  if (!isToken(token)) return null;
  const { data } = await db().from("newsletter_subscribers").select("id, email, token, status").eq("token", token).maybeSingle();
  return (data as Row | null) ?? null;
}

export async function confirmSubscription(token: string): Promise<boolean> {
  const row = await findByToken(token);
  if (!row) return false;
  if (row.status === "active") return true;
  const { error } = await db().from("newsletter_subscribers").update({ status: "active", confirmed_at: new Date().toISOString() }).eq("id", row.id);
  return !error;
}

export async function unsubscribe(token: string): Promise<boolean> {
  const row = await findByToken(token);
  if (!row) return false;
  const { error } = await db().from("newsletter_subscribers").update({ status: "unsubscribed" }).eq("id", row.id);
  return !error;
}

export async function newsletterCounts(): Promise<{ pending: number; active: number; unsubscribed: number }> {
  const out = { pending: 0, active: 0, unsubscribed: 0 };
  const { data } = await db().from("newsletter_subscribers").select("status");
  for (const r of (data ?? []) as { status: keyof typeof out }[]) out[r.status] += 1;
  return out;
}

/** Envio semanal: as ofertas mais quentes para quem confirmou e não recebeu nos últimos 6 dias. Roda em lotes. */
export async function runNewsletter(): Promise<{ sent: number; failed: number; skipped?: string }> {
  const cfg = await smtp();
  if (!cfg) return { sent: 0, failed: 0, skipped: "e-mail (SMTP) não configurado" };
  const cutoff = new Date(Date.now() - MIN_DAYS_BETWEEN * 86400_000).toISOString();
  const due = await db().from("newsletter_subscribers").select("id, email, token, status").eq("status", "active")
    .or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`).order("created_at").limit(SEND_BATCH);
  if (due.error) throw due.error;
  const subs = due.data as Row[];
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const { items } = await listFeedPage({ tab: "quentes", viewerId: null, limit: NEWSLETTER_MAX_DEALS });
  if (items.length === 0) return { sent: 0, failed: 0, skipped: "nenhuma oferta no ar" };
  const brand = await getSetting<BrandSettings>("public.brand", DEFAULT_BRAND);
  const base = baseUrl();
  const deals = items.map((d) => ({
    title: d.title, url: `${base}/oferta/${d.slug}`, priceCents: d.priceCents, couponCode: d.couponCode, store: d.store.name,
    discountPct: d.realDiscountBp ? Math.round(d.realDiscountBp / 100) : null,
  }));
  const batch = subs.map((s) => {
    const unsubscribeUrl = `${base}/boletim/sair?t=${s.token}`;
    return { to: s.email, unsubscribeUrl, mail: digestMail({ siteName: brand.siteName, siteUrl: base, deals, unsubscribeUrl }) };
  });
  const results = await sendMails(cfg, batch);
  const okEmails = new Set(results.filter((r) => r.ok).map((r) => r.to));
  const okIds = subs.filter((s) => okEmails.has(s.email)).map((s) => s.id);
  if (okIds.length) await db().from("newsletter_subscribers").update({ last_sent_at: new Date().toISOString() }).in("id", okIds);
  return { sent: okIds.length, failed: results.length - okIds.length };
}
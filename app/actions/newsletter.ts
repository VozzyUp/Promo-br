"use server";

import { clientIp, getSession } from "@/lib/auth";
import { confirmSubscription, isToken, subscribe, unsubscribe } from "@/lib/data/newsletter";
import { createLimiter } from "@/lib/rate-limit";

export type NewsletterState = { ok?: boolean; error?: string; done?: "confirm" | "unsubscribe" } | undefined;

// Cada inscrição manda um e-mail: freio por IP e por endereço para ninguém usar o site para encher a caixa de outra pessoa.
const byIp = createLimiter({ max: 8, windowMs: 60 * 60_000 });
const byEmail = createLimiter({ max: 3, windowMs: 60 * 60_000 });

export async function subscribeAction(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (String(form.get("website") ?? "") !== "") return { ok: true }; // campo-isca: robô preencheu, finge que deu certo
  const ip = byIp.hit(await clientIp());
  const em = byEmail.hit(email);
  if (!ip.ok || !em.ok) return { error: "Muitas tentativas. Tente de novo mais tarde." };
  const session = await getSession();
  const r = await subscribe(email, session?.userId ?? null);
  return "error" in r ? { error: r.error } : { ok: true };
}

/** Confirmar e cancelar são POST de propósito: antivírus e leitores de e-mail abrem links sozinhos e não podem mudar a inscrição. */
export async function confirmAction(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const t = String(form.get("t") ?? "");
  if (!isToken(t) || !(await confirmSubscription(t))) return { error: "Esse link não vale mais. Inscreva-se de novo pelo rodapé do site." };
  return { ok: true, done: "confirm" };
}

export async function unsubscribeAction(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const t = String(form.get("t") ?? "");
  if (!isToken(t) || !(await unsubscribe(t))) return { error: "Esse link não vale mais." };
  return { ok: true, done: "unsubscribe" };
}
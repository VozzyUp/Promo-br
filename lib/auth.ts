// Sessão e contas. Com Supabase configurado: Supabase Auth (cookies http-only geridos pelo @supabase/ssr,
// confirmação de e-mail obrigatória). Sem Supabase: cookie HMAC + camada em memória, só para desenvolvimento.
import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile, isUsernameTaken } from "./data";
import * as memory from "./data/memory";
import { supabaseAuth, supabaseEnabled } from "./supabase/server";
import type { Session } from "./types";

/* ------------------------------------------------------------------ sessão */

export const getSession = cache(async (): Promise<Session | null> => {
  const userId = supabaseEnabled() ? await supabaseUserId() : await devUserId();
  if (!userId) return null;
  const profile = await getProfile(userId);
  if (!profile || profile.bannedAt) return null;
  return { userId: profile.id, role: profile.role, username: profile.username };
});

async function supabaseUserId() {
  const supabase = await supabaseAuth();
  // getClaims valida o JWT (assinatura e validade); não confia só no cookie.
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

export async function requireUser(next = "/") {
  const s = await getSession();
  if (!s) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return s;
}

export async function requireModerator() {
  const s = await requireUser("/painel");
  if (s.role !== "admin" && s.role !== "moderator") redirect("/");
  return s;
}

export async function requireAdmin() {
  const s = await requireUser("/painel");
  if (s.role !== "admin") redirect("/painel");
  return s;
}

/* ------------------------------------------------------------------ contas */

export type SignUpResult = { error: string } | { status: "signed_in" } | { status: "confirm_email" };

export async function signUp(input: { email: string; password: string; username: string; displayName: string; next: string }): Promise<SignUpResult> {
  if (await isUsernameTaken(input.username)) return { error: "Esse nome de usuário já está em uso." };

  if (!supabaseEnabled()) {
    const r = await memory.createUser(input);
    if (!r.profile) return { error: r.error ?? "Não foi possível criar a conta." };
    await startDevSession(r.profile.id);
    return { status: "signed_in" };
  }

  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { username: input.username, display_name: input.displayName },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=${encodeURIComponent(input.next)}`,
    },
  });
  if (error) return { error: authMessage(error.code, error.message) };
  // Com confirmação ligada não há sessão até o clique no e-mail. E-mail já cadastrado cai aqui também,
  // de propósito: a resposta é a mesma para não revelar quem tem conta.
  return data.session ? { status: "signed_in" } : { status: "confirm_email" };
}

export async function signIn(email: string, password: string): Promise<{ error: string } | { ok: true }> {
  if (!supabaseEnabled()) {
    const profile = await memory.authenticate(email, password);
    if (!profile) return { error: "E-mail ou senha incorretos." };
    if (profile.bannedAt) return { error: "Esta conta está suspensa." };
    await startDevSession(profile.id);
    return { ok: true };
  }
  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authMessage(error.code, error.message) };
  const profile = await getProfile(data.user.id);
  if (!profile || profile.bannedAt) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Esta conta está suspensa." };
  }
  return { ok: true };
}

/** scope "global" encerra a sessão em todos os aparelhos. */
export async function signOut(scope: "local" | "global" = "local") {
  if (!supabaseEnabled()) {
    (await cookies()).delete(DEV_COOKIE);
    return;
  }
  await (await supabaseAuth()).auth.signOut({ scope });
}

export async function requestPasswordReset(email: string) {
  if (!supabaseEnabled()) return;
  const supabase = await supabaseAuth();
  // Erros não são mostrados: a resposta é sempre a mesma para não revelar quem tem conta.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/auth/confirm?next=/nova-senha` });
}

export async function updatePassword(password: string): Promise<{ error: string } | { ok: true }> {
  if (!supabaseEnabled()) return { error: "Troca de senha só funciona com o Supabase configurado." };
  const supabase = await supabaseAuth();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authMessage(error.code, error.message) };
  return { ok: true };
}

function authMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials": return "E-mail ou senha incorretos.";
    case "email_not_confirmed": return "Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada.";
    case "weak_password": return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
    case "same_password": return "A nova senha precisa ser diferente da atual.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Muitas tentativas. Espere alguns minutos e tente de novo.";
    case "signup_disabled": return "Cadastros estão fechados no momento.";
    case "email_address_invalid": return "Esse e-mail não parece válido.";
    case "email_address_not_authorized": return "Não conseguimos enviar e-mail para esse endereço agora. Tente outro e-mail.";
    case "user_already_exists":
    case "email_exists": return "Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.";
    case "unexpected_failure": return "Não foi possível criar a conta. Tente outro nome de usuário.";
    default:
      console.error("[auth]", code, fallback);
      return "Algo deu errado. Tente de novo em instantes.";
  }
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/* ------------------------------------------------------------------ sessão de desenvolvimento (sem Supabase) */

const DEV_COOKIE = "pb_session";
const DEV_MAX_AGE = 60 * 60 * 24 * 30;

function devSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não configurado");
  return s ?? "dev-only-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", devSecret()).update(value).digest("base64url");
}

async function startDevSession(userId: string) {
  const payload = `${userId}.${Date.now() + DEV_MAX_AGE * 1000}`;
  (await cookies()).set(DEV_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEV_MAX_AGE,
  });
}

async function devUserId() {
  const raw = (await cookies()).get(DEV_COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [userId, exp] = payload.split(".");
  return Number(exp) < Date.now() ? null : userId;
}

/* ------------------------------------------------------------------ visitante */

/** Hash diário do visitante (sem guardar IP; LGPD). */
export async function visitorHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "0";
  const ua = h.get("user-agent") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${process.env.HASH_SALT ?? "dev-salt"}|${ip}|${ua}|${day}`).digest("hex").slice(0, 32);
}

export async function isLikelyBot() {
  const ua = (await headers()).get("user-agent") ?? "";
  return !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram/i.test(ua);
}

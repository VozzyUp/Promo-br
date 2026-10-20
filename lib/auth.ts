// Sessão por cookie assinado (HMAC). Provisório até o Supabase Auth entrar em /replica-backend.
import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "./data";
import type { Session } from "./types";

const COOKIE = "pb_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não configurado");
  return s ?? "dev-only-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function startSession(userId: string) {
  const payload = `${userId}.${Date.now() + MAX_AGE * 1000}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [userId, exp] = payload.split(".");
  if (Number(exp) < Date.now()) return null;
  const profile = await getProfile(userId);
  if (!profile || profile.bannedAt) return null;
  return { userId: profile.id, role: profile.role, username: profile.username };
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

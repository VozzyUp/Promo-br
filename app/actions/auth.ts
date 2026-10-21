"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requestPasswordReset, signIn, signOut, signUp, updatePassword } from "@/lib/auth";
import { clientIp } from "@/lib/auth";
import { safeNext } from "@/lib/links";
import { createLimiter } from "@/lib/rate-limit";

// Freio contra tentativa em massa: por IP e por e-mail. O limite do Supabase Auth continua valendo por baixo.
const loginByIp = createLimiter({ max: 20, windowMs: 10 * 60_000 });
const loginByEmail = createLimiter({ max: 8, windowMs: 10 * 60_000 });
const signupByIp = createLimiter({ max: 10, windowMs: 60 * 60_000 });
const resetByIp = createLimiter({ max: 6, windowMs: 60 * 60_000 });
const WAIT = (s: number) => `Muitas tentativas. Espere ${Math.ceil(s / 60)} min e tente de novo.`;

export type AuthState = { error?: string; notice?: string; fields?: Record<string, string> } | undefined;

const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Conte como quer ser chamado (mín. 2 letras).").max(40),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Use de 3 a 24 letras minúsculas, números ou _."),
  email: z.string().trim().toLowerCase().email("Esse e-mail não parece válido.").max(254),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72),
  terms: z.literal("on", { message: "Você precisa aceitar os termos para criar a conta." }),
});

export async function signupAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form);
  const parsed = signupSchema.safeParse(raw);
  const fields = { displayName: String(raw.displayName ?? ""), username: String(raw.username ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };
  const limited = signupByIp.hit(await clientIp());
  if (!limited.ok) return { error: WAIT(limited.retryAfterSec), fields };
  const next = safeNext(form.get("next"));
  const result = await signUp({ ...parsed.data, next });
  if ("error" in result) return { error: result.error, fields };
  if (result.status === "confirm_email") {
    return { notice: `Enviamos um link de confirmação para ${parsed.data.email}. Abra o e-mail e clique no link para ativar a conta.` };
  }
  redirect(next);
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha.", fields: { email } };
  const byIp = loginByIp.hit(await clientIp());
  const byEmail = loginByEmail.hit(email);
  if (!byIp.ok || !byEmail.ok) return { error: WAIT(Math.max(!byIp.ok ? byIp.retryAfterSec : 0, !byEmail.ok ? byEmail.retryAfterSec : 0)), fields: { email } };
  const result = await signIn(email, password);
  if ("error" in result) return { error: result.error, fields: { email } };
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await signOut("local");
  redirect("/");
}

export async function forgotPasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Esse e-mail não parece válido.", fields: { email: String(form.get("email") ?? "") } };
  const limited = resetByIp.hit(await clientIp());
  if (!limited.ok) return { error: WAIT(limited.retryAfterSec), fields: { email: email.data } };
  await requestPasswordReset(email.data);
  // Mesma resposta exista a conta ou não.
  return { notice: "Se existir uma conta com esse e-mail, você vai receber um link para criar uma nova senha." };
}

export async function newPasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 72) return { error: "A senha precisa ter de 8 a 72 caracteres." };
  if (password !== form.get("confirm")) return { error: "As duas senhas não são iguais." };
  const result = await updatePassword(password);
  if ("error" in result) return { error: result.error };
  redirect("/?senha=1");
}

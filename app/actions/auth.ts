"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, createUser } from "@/lib/data";
import { endSession, startSession } from "@/lib/auth";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "/";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Conte como quer ser chamado (mín. 2 letras).").max(40),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Use de 3 a 24 letras minúsculas, números ou _."),
  email: z.string().trim().email("Esse e-mail não parece válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(128),
  terms: z.literal("on", { message: "Você precisa aceitar os termos para criar a conta." }),
});

export async function signupAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form);
  const parsed = signupSchema.safeParse(raw);
  const fields = { displayName: String(raw.displayName ?? ""), username: String(raw.username ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };
  const result = await createUser(parsed.data);
  if ("error" in result) return { error: result.error, fields };
  await startSession(result.profile.id);
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha.", fields: { email } };
  const profile = await authenticate(email, password);
  if (!profile) return { error: "E-mail ou senha incorretos.", fields: { email } };
  if (profile.bannedAt) return { error: "Esta conta está suspensa.", fields: { email } };
  await startSession(profile.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

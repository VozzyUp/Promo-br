"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession, signOut } from "@/lib/auth";
import { changeUsername, clearAvatar, deleteAccount, getAccountInfo, setAvatar, updateBio } from "@/lib/data/account";
import { syncBadges } from "@/lib/data/gamification";
import { checkImage } from "@/lib/image-check";
import { supabaseAuth } from "@/lib/supabase/server";

export type AccountState = { error?: string; ok?: boolean; notice?: string } | undefined;

const NOT_LOGGED = { error: "Entre na sua conta." } as const;

async function afterProfileChange(userId: string) {
  try {
    await syncBadges(userId);
  } catch (e) {
    console.error("[badges]", e);
  }
  revalidatePath("/", "layout");
}

export async function updateBioAction(_prev: AccountState, form: FormData): Promise<AccountState> {
  const session = await getSession();
  if (!session) return NOT_LOGGED;
  const bio = String(form.get("bio") ?? "").trim();
  if (bio.length > 200) return { error: "A descrição pode ter no máximo 200 caracteres." };
  try {
    await updateBio(session.userId, bio);
  } catch (e) {
    console.error("[bio]", e);
    return { error: "Não foi possível salvar agora." };
  }
  await afterProfileChange(session.userId);
  return { ok: true };
}

export async function changeUsernameAction(_prev: AccountState, form: FormData): Promise<AccountState> {
  const session = await getSession();
  if (!session) return NOT_LOGGED;
  try {
    const r = await changeUsername(session.userId, String(form.get("username") ?? ""));
    if (r.error) return { error: r.error };
  } catch (e) {
    console.error("[username]", e);
    return { error: "Não foi possível trocar agora." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const AVATAR_MAX = 1024 * 1024;

export async function uploadAvatarAction(_prev: AccountState, form: FormData): Promise<AccountState> {
  const session = await getSession();
  if (!session) return NOT_LOGGED;
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha uma imagem." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = checkImage(bytes, { maxBytes: AVATAR_MAX, minSide: 100, maxSide: 4000 });
  if (problem) return { error: problem };
  try {
    const r = await setAvatar(session.userId, bytes);
    if (r.error) return { error: r.error };
  } catch (e) {
    console.error("[avatar]", e);
    return { error: "Não foi possível enviar a foto agora." };
  }
  await afterProfileChange(session.userId);
  return { ok: true };
}

export async function removeAvatarAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await clearAvatar(session.userId);
  revalidatePath("/", "layout");
}

const emailSchema = z.string().trim().toLowerCase().email("Esse e-mail não parece válido.").max(254);

export async function changeEmailAction(_prev: AccountState, form: FormData): Promise<AccountState> {
  const session = await getSession();
  if (!session) return NOT_LOGGED;
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await supabaseAuth();
  const { error } = await supabase.auth.updateUser({ email: parsed.data });
  if (error) {
    console.error("[email]", error.code);
    return { error: error.code === "email_exists" ? "Já existe uma conta com esse e-mail." : "Não foi possível trocar o e-mail agora." };
  }
  return { notice: `Enviamos um link de confirmação para ${parsed.data}. O e-mail só muda depois que você clicar nele.` };
}

export async function changePasswordAction(_prev: AccountState, form: FormData): Promise<AccountState> {
  const session = await getSession();
  if (!session) return NOT_LOGGED;
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8 || next.length > 72) return { error: "A senha nova precisa ter de 8 a 72 caracteres." };
  if (next !== form.get("confirm")) return { error: "As duas senhas novas não são iguais." };
  if (next === current) return { error: "A senha nova precisa ser diferente da atual." };
  const supabase = await supabaseAuth();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.email) return NOT_LOGGED;
  // Confere a senha atual antes de trocar (protege quem deixou o navegador aberto).
  const check = await supabase.auth.signInWithPassword({ email: user.user.email, password: current });
  if (check.error) return { error: "A senha atual não confere." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.code === "weak_password" ? "Senha fraca. Misture letras e números." : "Não foi possível trocar a senha agora." };
  return { ok: true };
}

export async function deleteAccountAction(_prev: AccountState, form: FormData): Promise<AccountState> {
  const session = await getSession();
  if (!session) return NOT_LOGGED;
  const info = await getAccountInfo(session.userId);
  if (!info || String(form.get("confirm") ?? "").trim().toLowerCase() !== info.username) {
    return { error: "Digite o seu nome de usuário para confirmar." };
  }
  try {
    const r = await deleteAccount(session.userId);
    if (r.error) return { error: r.error };
  } catch (e) {
    console.error("[delete-account]", e);
    return { error: "Não foi possível apagar a conta agora. Tente de novo." };
  }
  await signOut("local");
  redirect("/?conta=apagada");
}

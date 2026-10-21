// Dados da conta: descrição, nome de usuário, foto e exclusão (Supabase).
import "server-only";
import { EXTENSION, MIME, inspectImage } from "../image-check";
import { db } from "../supabase/db";
import { supabaseAdmin } from "../supabase/server";

const USERNAME = /^[a-z0-9_]{3,24}$/;
const RESERVED = new Set(["admin", "equipe", "suporte", "moderacao", "promo_br", "sistema", "root"]);
const TWELVE_MONTHS_MS = 365 * 86400_000;

export async function updateBio(userId: string, bio: string) {
  const { error } = await db().from("profiles").update({ bio: bio.trim() || null }).eq("id", userId);
  if (error) throw error;
}

export async function getAccountInfo(userId: string) {
  const { data, error } = await db()
    .from("profiles").select("username, display_name, bio, avatar_url, role, username_changed_at").eq("id", userId).maybeSingle();
  if (error) throw error;
  const p = data as { username: string; display_name: string; bio: string | null; avatar_url: string | null; role: string; username_changed_at: string | null } | null;
  if (!p) return null;
  const nextChange = p.username_changed_at ? new Date(new Date(p.username_changed_at).getTime() + TWELVE_MONTHS_MS) : null;
  return {
    username: p.username, displayName: p.display_name, bio: p.bio ?? "", avatarUrl: p.avatar_url, role: p.role,
    usernameChangeBlockedUntil: nextChange && nextChange.getTime() > Date.now() ? nextChange.toISOString() : null,
  };
}

/** Troca o nome de usuário, no máximo uma vez a cada 12 meses. */
export async function changeUsername(userId: string, raw: string): Promise<{ error?: string; username?: string }> {
  const username = raw.trim().toLowerCase();
  if (!USERNAME.test(username)) return { error: "Use de 3 a 24 letras minúsculas, números ou _." };
  if (RESERVED.has(username)) return { error: "Esse nome não está disponível." };
  const info = await getAccountInfo(userId);
  if (!info) return { error: "Conta não encontrada." };
  if (info.usernameChangeBlockedUntil) return { error: "O nome de usuário só pode ser trocado uma vez a cada 12 meses." };
  if (info.username === username) return { error: "Esse já é o seu nome de usuário." };
  const { count, error: e1 } = await db().from("profiles").select("id", { count: "exact", head: true }).eq("username", username);
  if (e1) throw e1;
  if ((count ?? 0) > 0) return { error: "Esse nome de usuário já está em uso." };
  const { error } = await db().from("profiles").update({ username, username_changed_at: new Date().toISOString() }).eq("id", userId);
  if (error) {
    if (error.code === "23505") return { error: "Esse nome de usuário já está em uso." };
    throw error;
  }
  return { username };
}

/** Envia a foto de perfil. Valida os bytes (não confia no tipo informado), guarda em avatars/<usuário>/ e remove a anterior. */
export async function setAvatar(userId: string, bytes: Uint8Array): Promise<{ error?: string; url?: string }> {
  const info = inspectImage(bytes);
  if (!info) return { error: "Use uma imagem JPG, PNG ou WebP." };
  const path = `${userId}/avatar-${Date.now()}.${EXTENSION[info.type]}`;
  const storage = db().storage.from("avatars");
  const { data: old } = await db().from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await storage.upload(path, bytes, { contentType: MIME[info.type], upsert: false });
  if (error) throw error;
  const url = storage.getPublicUrl(path).data.publicUrl;
  const { error: e2 } = await db().from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (e2) throw e2;
  await removeAvatarFile((old as { avatar_url: string | null } | null)?.avatar_url ?? null);
  return { url };
}

export async function clearAvatar(userId: string) {
  const { data } = await db().from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await db().from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
  await removeAvatarFile((data as { avatar_url: string | null } | null)?.avatar_url ?? null);
}

async function removeAvatarFile(url: string | null) {
  const marker = "/avatars/";
  const i = url ? url.indexOf(marker) : -1;
  if (!url || i < 0) return;
  await db().storage.from("avatars").remove([url.slice(i + marker.length)]);
}

/** Apaga a conta. As ofertas ficam, sem autor; comentários ficam como "usuário removido"; o resto dos dados é apagado em cascata. */
export async function deleteAccount(userId: string): Promise<{ error?: string }> {
  const info = await getAccountInfo(userId);
  if (!info) return { error: "Conta não encontrada." };
  if (info.role !== "user") return { error: "Contas da equipe não podem ser apagadas por aqui. Fale com o administrador." };
  await removeAvatarFile(info.avatarUrl);
  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);
  if (error) throw error;
  return {};
}

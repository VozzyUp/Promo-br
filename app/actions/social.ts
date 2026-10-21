"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getPersonByUsername, sendMessage } from "@/lib/data/messages";
import { setRelation, toggleSaved, type Relation } from "@/lib/data/relations";

const uuid = z.string().uuid();

export async function toggleSaveAction(dealId: string): Promise<{ saved: boolean } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Entre na sua conta para salvar." };
  if (!uuid.safeParse(dealId).success) return { error: "Oferta inválida." };
  try {
    return { saved: await toggleSaved(session.userId, dealId) };
  } catch (e) {
    console.error("[save]", e);
    return { error: "Não foi possível salvar agora." };
  }
}

export async function setRelationAction(targetId: string, kind: Relation): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Entre na sua conta." };
  if (!uuid.safeParse(targetId).success || (kind !== null && kind !== "follow" && kind !== "ignore")) return { error: "Pedido inválido." };
  try {
    const r = await setRelation(session.userId, targetId, kind);
    if (r.error) return { error: r.error };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("[relation]", e);
    return { error: "Não foi possível fazer isso agora." };
  }
}

/** Botão "deixar de seguir/ignorar" da lista em Ajustes. */
export async function removeRelationFormAction(form: FormData): Promise<void> {
  const session = await getSession();
  const id = String(form.get("id") ?? "");
  if (!session || !uuid.safeParse(id).success) return;
  await setRelation(session.userId, id, null);
  revalidatePath("/conta/ajustes");
  revalidatePath("/");
}

export type MessageState ={ error?: string; ok?: boolean } | undefined;

const messageSchema = z.object({
  to: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/),
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(2000, "Máximo de 2.000 caracteres."),
});

export async function sendMessageAction(_prev: MessageState, form: FormData): Promise<MessageState> {
  const session = await getSession();
  if (!session) return { error: "Entre na sua conta para mandar mensagens." };
  const parsed = messageSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mensagem inválida." };
  try {
    const to = await getPersonByUsername(parsed.data.to);
    if (!to) return { error: "Não encontramos essa pessoa." };
    const r = await sendMessage(session.userId, to, parsed.data.body);
    if (r.error) return { error: r.error };
    revalidatePath(`/conta/mensagens/${to.username}`);
    revalidatePath("/conta/mensagens");
    return { ok: true };
  } catch (e) {
    console.error("[message]", e);
    return { error: "Não foi possível enviar agora. Tente de novo." };
  }
}

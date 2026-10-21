// Mensagens privadas entre pessoas (Supabase).
import "server-only";
import { db } from "../supabase/db";
import { getPrefs } from "./social";

const PER_DAY = 30;

export type Person = { id: string; username: string; displayName: string };
export type Conversation = { other: Person; lastBody: string; lastAt: string; lastMine: boolean; unread: number };
export type ChatMessage = { id: string; body: string; createdAt: string; mine: boolean };

type MRow = { id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; created_at: string };

const UUID = /^[0-9a-f-]{36}$/i;
const guard = (id: string) => {
  if (!UUID.test(id)) throw new Error("id inválido");
  return id;
};

export async function listConversations(userId: string): Promise<Conversation[]> {
  const me = guard(userId);
  const { data, error } = await db()
    .from("messages").select("id, sender_id, recipient_id, body, read_at, created_at")
    .or(`sender_id.eq.${me},recipient_id.eq.${me}`).order("created_at", { ascending: false }).limit(400);
  if (error) throw error;
  const byOther = new Map<string, Conversation>();
  const meta = new Map<string, { id: string }>();
  for (const m of data as MRow[]) {
    const otherId = m.sender_id === me ? m.recipient_id : m.sender_id;
    meta.set(otherId, { id: otherId });
    const cur = byOther.get(otherId);
    const unread = m.recipient_id === me && !m.read_at ? 1 : 0;
    if (!cur) {
      byOther.set(otherId, {
        other: { id: otherId, username: "", displayName: "" }, lastBody: m.body, lastAt: m.created_at, lastMine: m.sender_id === me, unread,
      });
    } else {
      cur.unread += unread;
    }
  }
  const ids = [...byOther.keys()];
  if (ids.length === 0) return [];
  const { data: people, error: e2 } = await db().from("profiles").select("id, username, display_name").in("id", ids);
  if (e2) throw e2;
  for (const p of people as { id: string; username: string; display_name: string }[]) {
    const c = byOther.get(p.id);
    if (c) c.other = { id: p.id, username: p.username, displayName: p.display_name };
  }
  return [...byOther.values()].filter((c) => c.other.username);
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const { count, error } = await db()
    .from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function getPersonByUsername(username: string): Promise<Person | null> {
  const { data, error } = await db()
    .from("profiles").select("id, username, display_name").eq("username", username.toLowerCase()).is("banned_at", null).maybeSingle();
  if (error) throw error;
  const p = data as { id: string; username: string; display_name: string } | null;
  return p ? { id: p.id, username: p.username, displayName: p.display_name } : null;
}

/** Conversa com uma pessoa; marca como lidas as mensagens que ela mandou. */
export async function getThread(userId: string, otherId: string, limit = 100): Promise<ChatMessage[]> {
  const me = guard(userId);
  const other = guard(otherId);
  const { data, error } = await db()
    .from("messages").select("id, sender_id, recipient_id, body, read_at, created_at")
    .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  await db().from("messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", me).eq("sender_id", other).is("read_at", null);
  return (data as MRow[]).reverse().map((m) => ({ id: m.id, body: m.body, createdAt: m.created_at, mine: m.sender_id === me }));
}

export async function sendMessage(fromId: string, to: Person, body: string): Promise<{ error?: string }> {
  if (fromId === to.id) return { error: "Você não pode mandar mensagem para si mesmo." };
  if (!(await getPrefs(to.id)).allow_messages) return { error: "Essa pessoa não aceita mensagens privadas." };
  const { count: blocked, error: e1 } = await db()
    .from("follows").select("target_id", { count: "exact", head: true }).eq("follower_id", to.id).eq("target_id", fromId).eq("kind", "ignore");
  if (e1) throw e1;
  if ((blocked ?? 0) > 0) return { error: "Essa pessoa não aceita mensagens suas." };
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count: sent, error: e2 } = await db().from("messages").select("id", { count: "exact", head: true }).eq("sender_id", fromId).gte("created_at", since);
  if (e2) throw e2;
  if ((sent ?? 0) >= PER_DAY) return { error: `Você chegou ao limite de ${PER_DAY} mensagens por dia.` };

  const { error } = await db().from("messages").insert({ sender_id: fromId, recipient_id: to.id, body });
  if (error) throw error;
  await db().rpc("push_notification", { p_user: to.id, p_kind: "message", p_actor: fromId, p_deal: null, p_comment: null, p_data: {} });
  return {};
}

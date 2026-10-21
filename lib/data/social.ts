// Preferências e notificações da conta (Supabase).
import "server-only";
import { FILTER_KINDS, type NotificationFilter, type NotificationRow } from "../notifications";
import { resolvePrefs, type Prefs } from "../prefs";
import { db } from "../supabase/db";

export async function getPrefs(userId: string): Promise<Prefs> {
  const { data, error } = await db().from("user_settings").select("prefs").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return resolvePrefs((data as { prefs: unknown } | null)?.prefs);
}

export async function savePrefs(userId: string, prefs: Prefs) {
  const { error } = await db()
    .from("user_settings")
    .upsert({ user_id: userId, prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

type NRow = {
  id: number; kind: string; comment_id: string | null; data: Record<string, unknown>; read_at: string | null; created_at: string;
  actor: { username: string } | null; deal: { slug: string; title: string } | null;
};

const NCOLS =
  "id, kind, comment_id, data, read_at, created_at, " +
  "actor:profiles!notifications_actor_id_fkey(username), deal:deals!notifications_deal_id_fkey(slug, title)";

export async function listNotifications(userId: string, opts: { limit?: number; filter?: NotificationFilter } = {}) {
  let q = db().from("notifications").select(NCOLS).eq("user_id", userId).order("id", { ascending: false }).limit(opts.limit ?? 30);
  if (opts.filter && opts.filter !== "todas") q = q.in("kind", FILTER_KINDS[opts.filter]);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as NRow[]).map(
    (r): NotificationRow => ({
      id: r.id, kind: r.kind, actor: r.actor?.username ?? null, dealSlug: r.deal?.slug ?? null, dealTitle: r.deal?.title ?? null,
      commentId: r.comment_id, data: r.data ?? {}, readAt: r.read_at, createdAt: r.created_at,
    }),
  );
}

export async function countUnread(userId: string) {
  const { count, error } = await db()
    .from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead(userId: string) {
  const { error } = await db().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (error) throw error;
}

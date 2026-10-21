// Comentários, reações, denúncias e inscrição em ofertas (Supabase).
import "server-only";
import { db } from "../supabase/db";
import type { CommentReaction, CommentView, Role } from "../types";

type AuthorRow = { id: string; username: string; display_name: string; avatar_url: string | null; role: Role };
type Row = {
  id: string; deal_id: string; parent_id: string | null; user_id: string | null; body: string;
  status: "visible" | "removed"; created_at: string; likes_count: number; helpful_count: number; haha_count: number;
  author: AuthorRow | null;
};

const COLS =
  "id, deal_id, parent_id, user_id, body, status, created_at, likes_count, helpful_count, haha_count, " +
  "author:profiles!comments_user_id_fkey(id, username, display_name, avatar_url, role)";

function toView(r: Row, mine: CommentReaction | null): CommentView {
  return {
    id: r.id, dealId: r.deal_id, parentId: r.parent_id, body: r.body, removed: r.status === "removed", createdAt: r.created_at,
    author: r.author
      ? { id: r.author.id, username: r.author.username, displayName: r.author.display_name, avatarUrl: r.author.avatar_url, role: r.author.role }
      : null,
    likes: r.likes_count, helpful: r.helpful_count, haha: r.haha_count, mine, replies: [],
  };
}

/** Comentários da oferta em árvore de 2 níveis. Escondidos por denúncia não aparecem; removidos só se tiverem respostas. */
export async function listComments(dealId: string, viewerId: string | null, order: "asc" | "desc" = "asc") {
  const { data, error } = await db()
    .from("comments").select(COLS).eq("deal_id", dealId).in("status", ["visible", "removed"])
    .order("created_at", { ascending: true }).limit(400);
  if (error) throw error;
  const rows = data as unknown as Row[];

  const mineById = new Map<string, CommentReaction>();
  if (viewerId && rows.length) {
    const { data: mine, error: e2 } = await db()
      .from("comment_reactions").select("comment_id, kind").eq("user_id", viewerId).in("comment_id", rows.map((r) => r.id));
    if (e2) throw e2;
    for (const m of mine as { comment_id: string; kind: CommentReaction }[]) mineById.set(m.comment_id, m.kind);
  }

  const views = new Map(rows.map((r) => [r.id, toView(r, mineById.get(r.id) ?? null)]));
  const tops: CommentView[] = [];
  for (const v of views.values()) {
    if (v.parentId) views.get(v.parentId)?.replies.push(v);
    else tops.push(v);
  }
  const visibleTops = tops.filter((t) => !t.removed || t.replies.some((r) => !r.removed));
  for (const t of visibleTops) t.replies = t.replies.filter((r) => !r.removed);
  if (order === "desc") visibleTops.reverse();
  return { comments: visibleTops, total: rows.filter((r) => r.status === "visible").length };
}

export async function createComment(input: {
  dealId?: string | null; threadId?: string | null; userId: string; parentId: string | null; body: string; mentions: string[];
}) {
  let mentionIds: string[] = [];
  if (input.mentions.length) {
    const { data, error } = await db().from("profiles").select("id").in("username", input.mentions).is("banned_at", null);
    if (error) throw error;
    mentionIds = (data as { id: string }[]).map((p) => p.id);
  }
  const { data, error } = await db().rpc("create_comment", {
    p_deal: input.dealId ?? null, p_thread: input.threadId ?? null, p_user: input.userId, p_parent: input.parentId,
    p_body: input.body, p_mentions: mentionIds,
  });
  if (error) throw error;
  return data as string;
}

export async function reactToComment(commentId: string, userId: string, kind: CommentReaction) {
  const { data, error } = await db().rpc("react_comment", { p_comment: commentId, p_user: userId, p_kind: kind });
  if (error) throw error;
  const row = (data as { likes: number; helpful: number; haha: number; mine: CommentReaction | null }[])[0];
  return row ?? null;
}

/** Autor ou equipe tira o comentário do ar (fica um marcador se houver respostas). */
export async function removeComment(commentId: string, actor: { id: string; role: Role }) {
  const { data, error } = await db().from("comments").select("id, user_id, deal_id").eq("id", commentId).maybeSingle();
  if (error) throw error;
  const c = data as { id: string; user_id: string | null; deal_id: string } | null;
  if (!c) return null;
  const staff = actor.role === "admin" || actor.role === "moderator";
  if (c.user_id !== actor.id && !staff) return null;
  const { error: e2 } = await db().from("comments").update({ status: "removed" }).eq("id", commentId);
  if (e2) throw e2;
  if (staff && c.user_id !== actor.id) {
    await db().from("moderation_actions").insert({ moderator_id: actor.id, target_type: "comment", target_id: commentId, action: "remove", reason: null });
  }
  return c.deal_id;
}

export async function reportComment(commentId: string, userId: string, kind: string, note: string | null) {
  const { data, error } = await db().rpc("report_comment", { p_comment: commentId, p_user: userId, p_kind: kind, p_note: note });
  if (error) throw error;
  return data as "ok" | "hidden" | "not_found";
}

export async function reportDeal(dealId: string, userId: string, kind: string, note: string | null) {
  const { data, error } = await db().rpc("report_deal", { p_deal: dealId, p_user: userId, p_kind: kind, p_note: note });
  if (error) throw error;
  return data as "ok" | "expired" | "not_found";
}

/** Autor ou equipe encerra a oferta na hora. */
export async function markDealExpired(dealId: string, actor: { id: string; role: Role }) {
  const { data, error } = await db().from("deals").select("id, slug, author_id, status").eq("id", dealId).maybeSingle();
  if (error) throw error;
  const d = data as { id: string; slug: string; author_id: string | null; status: string } | null;
  if (!d || d.status !== "published") return null;
  const staff = actor.role === "admin" || actor.role === "moderator";
  if (d.author_id !== actor.id && !staff) return null;
  const { error: e2 } = await db()
    .from("deals").update({ status: "expired", expired_reason: staff && d.author_id !== actor.id ? "moderation" : "author", expired_by: actor.id })
    .eq("id", dealId);
  if (e2) throw e2;
  return d.slug;
}

export async function getDealSlugById(dealId: string) {
  const { data, error } = await db().from("deals").select("slug").eq("id", dealId).maybeSingle();
  if (error) throw error;
  return (data as { slug: string } | null)?.slug ?? null;
}

export async function getCommentDealId(commentId: string) {
  const { data, error } = await db().from("comments").select("deal_id").eq("id", commentId).maybeSingle();
  if (error) throw error;
  return (data as { deal_id: string } | null)?.deal_id ?? null;
}

export async function countCommentsSince(userId: string, sinceIso: string) {
  const { count, error } = await db().from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function hasSameRecentComment(userId: string, body: string, sinceIso: string) {
  const { count, error } = await db()
    .from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("body", body).gte("created_at", sinceIso);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function isSubscribed(dealId: string, userId: string) {
  const { count, error } = await db()
    .from("deal_subscriptions").select("deal_id", { count: "exact", head: true }).eq("deal_id", dealId).eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function setSubscription(dealId: string, userId: string, on: boolean) {
  if (on) {
    const { error } = await db().from("deal_subscriptions").upsert({ deal_id: dealId, user_id: userId }, { onConflict: "deal_id,user_id", ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await db().from("deal_subscriptions").delete().eq("deal_id", dealId).eq("user_id", userId);
    if (error) throw error;
  }
}

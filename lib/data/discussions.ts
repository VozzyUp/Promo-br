// Discussões: conversas sem oferta (Supabase).
import "server-only";
import { randomBytes } from "node:crypto";
import { slugify } from "../format";
import { db } from "../supabase/db";
import type { DiscussionKind } from "../discussions";
import type { Role } from "../types";

export type DiscussionItem = {
  id: string;
  slug: string;
  title: string;
  body: string;
  kind: DiscussionKind;
  commentsCount: number;
  lastActivityAt: string;
  createdAt: string;
  authorId: string | null;
  author: { username: string; displayName: string } | null;
  category: { name: string; slug: string } | null;
};

type Row = {
  id: string; slug: string; title: string; body: string; kind: DiscussionKind; comments_count: number;
  last_activity_at: string; created_at: string; author_id: string | null;
  author: { username: string; display_name: string } | null; category: { name: string; slug: string } | null;
};

const COLS =
  "id, slug, title, body, kind, comments_count, last_activity_at, created_at, author_id, " +
  "author:profiles!discussions_author_id_fkey(username, display_name), category:categories(name, slug)";

function toItem(r: Row): DiscussionItem {
  return {
    id: r.id, slug: r.slug, title: r.title, body: r.body, kind: r.kind, commentsCount: r.comments_count,
    lastActivityAt: r.last_activity_at, createdAt: r.created_at, authorId: r.author_id,
    author: r.author ? { username: r.author.username, displayName: r.author.display_name } : null,
    category: r.category,
  };
}

export async function listDiscussions(opts: { kind?: DiscussionKind; limit?: number; offset?: number } = {}) {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  let q = db().from("discussions").select(COLS).eq("status", "published").order("last_activity_at", { ascending: false });
  if (opts.kind) q = q.eq("kind", opts.kind);
  const { data, error } = await q.range(offset, offset + limit);
  if (error) throw error;
  const rows = data as unknown as Row[];
  return { items: rows.slice(0, limit).map(toItem), nextOffset: rows.length > limit ? offset + limit : null };
}

export async function getDiscussionBySlug(slug: string): Promise<DiscussionItem | null> {
  const { data, error } = await db().from("discussions").select(COLS).eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data ? toItem(data as unknown as Row) : null;
}

export async function createDiscussion(input: { authorId: string; title: string; body: string; kind: DiscussionKind; categoryId: string | null }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = `${slugify(input.title)}-${randomBytes(2).toString("hex")}`;
    const { error } = await db().from("discussions").insert({
      slug, title: input.title, body: input.body, kind: input.kind, category_id: input.categoryId, author_id: input.authorId,
    });
    if (!error) return { slug };
    if (error.code !== "23505") throw error; // 23505 = slug repetido: tenta outro sufixo
  }
  throw new Error("Não foi possível gerar um endereço único para a discussão");
}

export async function countDiscussionsSince(userId: string, sinceIso: string) {
  const { count, error } = await db()
    .from("discussions").select("id", { count: "exact", head: true }).eq("author_id", userId).gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

/** Autor ou equipe tira a discussão do ar. */
export async function removeDiscussion(id: string, actor: { id: string; role: Role }) {
  const { data, error } = await db().from("discussions").select("id, author_id").eq("id", id).maybeSingle();
  if (error) throw error;
  const d = data as { id: string; author_id: string | null } | null;
  if (!d) return false;
  const staff = actor.role === "admin" || actor.role === "moderator";
  if (d.author_id !== actor.id && !staff) return false;
  const { error: e2 } = await db().from("discussions").update({ status: "removed" }).eq("id", id);
  if (e2) throw e2;
  if (staff && d.author_id !== actor.id) {
    await db().from("moderation_actions").insert({ moderator_id: actor.id, target_type: "comment", target_id: id, action: "remove_discussion", reason: null });
  }
  return true;
}

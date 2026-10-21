// Perfil público de um usuário (Supabase).
import "server-only";
import { db } from "../supabase/db";
import type { Role } from "../types";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  reputation: number;
  trusted: boolean;
  createdAt: string;
  dealsCount: number;
  commentsCount: number;
};

type Row = {
  id: string; username: string; display_name: string; avatar_url: string | null; role: Role;
  reputation: number; trusted: boolean; created_at: string;
};

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const { data, error } = await db()
    .from("profiles").select("id, username, display_name, avatar_url, role, reputation, trusted, created_at")
    .eq("username", username.toLowerCase()).is("banned_at", null).maybeSingle();
  if (error) throw error;
  const p = data as Row | null;
  if (!p) return null;
  const [deals, comments] = await Promise.all([
    db().from("deals").select("id", { count: "exact", head: true }).eq("author_id", p.id).in("status", ["published", "expired"]),
    db().from("comments").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("status", "visible"),
  ]);
  return {
    id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url, role: p.role,
    reputation: p.reputation, trusted: p.trusted, createdAt: p.created_at,
    dealsCount: deals.count ?? 0, commentsCount: comments.count ?? 0,
  };
}

export type UserComment = { id: string; body: string; createdAt: string; dealSlug: string; dealTitle: string };

export async function listUserComments(userId: string, limit = 20): Promise<UserComment[]> {
  const { data, error } = await db()
    .from("comments").select("id, body, created_at, deal:deals!comments_deal_id_fkey(slug, title, status)")
    .eq("user_id", userId).eq("status", "visible").order("created_at", { ascending: false }).limit(limit * 2);
  if (error) throw error;
  type R = { id: string; body: string; created_at: string; deal: { slug: string; title: string; status: string } | null };
  return (data as unknown as R[])
    .filter((c) => c.deal && (c.deal.status === "published" || c.deal.status === "expired"))
    .slice(0, limit)
    .map((c) => ({ id: c.id, body: c.body, createdAt: c.created_at, dealSlug: c.deal!.slug, dealTitle: c.deal!.title }));
}

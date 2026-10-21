// Painel da equipe: gestão de ofertas e de usuários, com registro em moderation_actions. Só Supabase.
import "server-only";
import { db } from "../supabase/db";

export type StaffDeal = {
  id: string; slug: string; title: string; status: "pending" | "published" | "expired" | "rejected" | "removed";
  store: string; priceCents: number | null; couponCode: string | null; source: "user" | "admin" | "robot";
  author: string; createdAt: string; boostedUntil: string | null; verdict: string; categoryId: string | null;
};

type DealRow = {
  id: string; slug: string; title: string; status: StaffDeal["status"]; price_cents: number | null; coupon_code: string | null;
  source: StaffDeal["source"]; created_at: string; boosted_until: string | null; verdict: string; category_id: string | null;
  store: { name: string } | null; author: { username: string } | null;
};

export const STAFF_PAGE = 30;

export async function listStaffDeals(o: { status?: string; q?: string; kind?: "oferta" | "cupom"; page: number }): Promise<{ items: StaffDeal[]; hasNext: boolean }> {
  let q = db().from("deals")
    .select("id, slug, title, status, price_cents, coupon_code, source, created_at, boosted_until, verdict, category_id, store:stores(name), author:profiles!deals_author_id_fkey(username)")
    .order("created_at", { ascending: false });
  if (o.status && ["pending", "published", "expired", "rejected", "removed"].includes(o.status)) q = q.eq("status", o.status);
  if (o.kind === "cupom") q = q.not("coupon_code", "is", null);
  if (o.kind === "oferta") q = q.is("coupon_code", null);
  if (o.q) q = q.ilike("title", `%${o.q.replace(/[%_,()]/g, " ").slice(0, 80)}%`);
  const from = (Math.max(1, o.page) - 1) * STAFF_PAGE;
  const { data, error } = await q.range(from, from + STAFF_PAGE);
  if (error) throw error;
  const rows = data as unknown as DealRow[];
  return {
    hasNext: rows.length > STAFF_PAGE,
    items: rows.slice(0, STAFF_PAGE).map((r) => ({
      id: r.id, slug: r.slug, title: r.title, status: r.status, store: r.store?.name ?? "?", priceCents: r.price_cents,
      couponCode: r.coupon_code, source: r.source, author: r.author?.username ?? "removido", createdAt: r.created_at,
      boostedUntil: r.boosted_until, verdict: r.verdict, categoryId: r.category_id,
    })),
  };
}

export async function logModeration(moderatorId: string | null, type: "deal" | "comment" | "coupon" | "user" | "store", targetId: string, action: string, reason: string | null) {
  const { error } = await db().from("moderation_actions").insert({ moderator_id: moderatorId, target_type: type, target_id: targetId, action, reason });
  if (error) console.error("[staff] registro de moderação", error);
}

export async function editDeal(id: string, patch: { title: string; categoryId: string | null }) {
  const { error } = await db().from("deals").update({ title: patch.title, category_id: patch.categoryId }).eq("id", id);
  if (error) throw error;
}

export async function setDealStatus(id: string, status: "expired" | "removed" | "published", reason: string | null) {
  const upd: Record<string, unknown> = { status };
  if (status === "expired") upd.expired_reason = reason ?? "expirada pela equipe";
  if (status === "published") { upd.published_at = new Date().toISOString(); upd.expired_reason = null; }
  const { error } = await db().from("deals").update(upd).eq("id", id);
  if (error) throw error;
}

/** Destaque: sobe no feed até a data. null tira o destaque. */
export async function setDealBoost(id: string, hours: number | null) {
  const until = hours ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
  const { error } = await db().from("deals").update({ boosted_until: until }).eq("id", id);
  if (error) throw error;
}

export type StaffUser = {
  id: string; username: string; role: "user" | "moderator" | "admin" | "system"; reputation: number; trusted: boolean;
  approvedPosts: number; bannedAt: string | null; banReason: string | null; createdAt: string;
};

type UserRow = {
  id: string; username: string; role: StaffUser["role"]; reputation: number; trusted: boolean; approved_posts: number;
  banned_at: string | null; ban_reason: string | null; created_at: string;
};

export async function listStaffUsers(q: string, onlyBanned: boolean): Promise<StaffUser[]> {
  let query = db().from("profiles")
    .select("id, username, role, reputation, trusted, approved_posts, banned_at, ban_reason, created_at")
    .neq("role", "system").order("created_at", { ascending: false }).limit(60);
  if (q) query = query.ilike("username", `%${q.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24)}%`);
  if (onlyBanned) query = query.not("banned_at", "is", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data as UserRow[]).map((r) => ({
    id: r.id, username: r.username, role: r.role, reputation: r.reputation, trusted: r.trusted,
    approvedPosts: r.approved_posts, bannedAt: r.banned_at, banReason: r.ban_reason, createdAt: r.created_at,
  }));
}

export async function getUserRole(id: string): Promise<StaffUser["role"] | null> {
  const { data, error } = await db().from("profiles").select("role").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as { role: StaffUser["role"] } | null)?.role ?? null;
}

export async function updateUser(id: string, patch: { trusted?: boolean; role?: "user" | "moderator" | "admin"; banned?: boolean; banReason?: string | null }) {
  const upd: Record<string, unknown> = {};
  if (patch.trusted !== undefined) upd.trusted = patch.trusted;
  if (patch.role) upd.role = patch.role;
  if (patch.banned !== undefined) { upd.banned_at = patch.banned ? new Date().toISOString() : null; upd.ban_reason = patch.banned ? patch.banReason ?? null : null; }
  const { error } = await db().from("profiles").update(upd).eq("id", id).neq("role", "system");
  if (error) throw error;
}
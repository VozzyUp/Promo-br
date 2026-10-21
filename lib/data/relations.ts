// Ofertas salvas e relações entre pessoas: seguir e ignorar (Supabase).
import "server-only";
import { db } from "../supabase/db";
import type { DealView } from "../types";
import { getPrefs } from "./social";
import { JOIN, toViews, type DealJoinRow } from "./supabase";

const MAX_FOLLOWS = 500;

/* ---------------------------------------------------------------- salvos */

export async function savedSet(userId: string, dealIds: string[]): Promise<Set<string>> {
  if (dealIds.length === 0) return new Set();
  const { data, error } = await db().from("saved_deals").select("deal_id").eq("user_id", userId).in("deal_id", dealIds);
  if (error) throw error;
  return new Set((data as { deal_id: string }[]).map((r) => r.deal_id));
}

/** Salva ou tira dos salvos. Devolve o estado novo. */
export async function toggleSaved(userId: string, dealId: string): Promise<boolean> {
  const { count, error } = await db().from("saved_deals").select("deal_id", { count: "exact", head: true }).eq("user_id", userId).eq("deal_id", dealId);
  if (error) throw error;
  if ((count ?? 0) > 0) {
    const { error: e2 } = await db().from("saved_deals").delete().eq("user_id", userId).eq("deal_id", dealId);
    if (e2) throw e2;
    return false;
  }
  const { error: e3 } = await db().from("saved_deals").insert({ user_id: userId, deal_id: dealId });
  if (e3) throw e3;
  return true;
}

export async function listSavedDeals(userId: string, limit = 50): Promise<DealView[]> {
  const { data, error } = await db().from("saved_deals").select("deal_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const ids = (data as { deal_id: string }[]).map((r) => r.deal_id);
  if (ids.length === 0) return [];
  const { data: deals, error: e2 } = await db().from("deals").select(JOIN).in("id", ids).in("status", ["published", "expired"]);
  if (e2) throw e2;
  const views = await toViews(deals as unknown as DealJoinRow[], userId);
  const order = new Map(ids.map((id, i) => [id, i]));
  return views.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/* ---------------------------------------------------------------- seguir e ignorar */

export type Relation = "follow" | "ignore" | null;

export async function getRelation(me: string, target: string): Promise<Relation> {
  const { data, error } = await db().from("follows").select("kind").eq("follower_id", me).eq("target_id", target).maybeSingle();
  if (error) throw error;
  return ((data as { kind: "follow" | "ignore" } | null)?.kind ?? null) as Relation;
}

export async function setRelation(me: string, target: string, kind: Relation): Promise<{ error?: string }> {
  if (me === target) return { error: "Você não pode fazer isso com a própria conta." };
  if (kind === null) {
    const { error } = await db().from("follows").delete().eq("follower_id", me).eq("target_id", target);
    if (error) throw error;
    return {};
  }
  if (kind === "follow") {
    if (!(await getPrefs(target)).allow_follow) return { error: "Essa pessoa não aceita seguidores." };
    const { count, error } = await db().from("follows").select("target_id", { count: "exact", head: true }).eq("follower_id", me).eq("kind", "follow");
    if (error) throw error;
    if ((count ?? 0) >= MAX_FOLLOWS) return { error: `Você já segue ${MAX_FOLLOWS} pessoas.` };
  }
  const { error } = await db().from("follows").upsert({ follower_id: me, target_id: target, kind }, { onConflict: "follower_id,target_id" });
  if (error) throw error;
  return {};
}

export type RelationItem = { id: string; username: string; displayName: string };

export async function listRelations(me: string, kind: "follow" | "ignore"): Promise<RelationItem[]> {
  const { data, error } = await db()
    .from("follows").select("target:profiles!follows_target_id_fkey(id, username, display_name)")
    .eq("follower_id", me).eq("kind", kind).order("created_at", { ascending: false });
  if (error) throw error;
  type R = { target: { id: string; username: string; display_name: string } | null };
  return (data as unknown as R[]).filter((r) => r.target).map((r) => ({ id: r.target!.id, username: r.target!.username, displayName: r.target!.display_name }));
}

export async function ignoredAuthorIds(me: string): Promise<string[]> {
  const { data, error } = await db().from("follows").select("target_id").eq("follower_id", me).eq("kind", "ignore");
  if (error) throw error;
  return (data as { target_id: string }[]).map((r) => r.target_id);
}

export async function followedAuthorIds(me: string): Promise<string[]> {
  const { data, error } = await db().from("follows").select("target_id").eq("follower_id", me).eq("kind", "follow");
  if (error) throw error;
  return (data as { target_id: string }[]).map((r) => r.target_id);
}

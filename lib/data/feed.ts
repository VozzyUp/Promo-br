// Feed de ofertas: abas, ofertas ignoradas, janela de início/fim e a aba "Pra você" (Supabase).
import "server-only";
import { db } from "../supabase/db";
import type { DealView, FeedTab } from "../types";
import { followedAuthorIds, ignoredAuthorIds } from "./relations";
import { JOIN, toViews, type DealJoinRow } from "./supabase";

type Opts = { tab: FeedTab; viewerId: string | null; limit?: number; offset?: number; storeId?: string; categoryId?: string };

/** Categorias das ofertas em que a pessoa votou "quente" nos últimos 90 dias (as 5 mais frequentes). */
async function favoriteCategories(viewerId: string): Promise<string[]> {
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const { data, error } = await db()
    .from("votes").select("deal:deals!votes_deal_id_fkey(category_id)").eq("user_id", viewerId).eq("value", 1).gte("created_at", since).limit(200);
  if (error) throw error;
  const count = new Map<string, number>();
  for (const r of data as unknown as { deal: { category_id: string | null } | null }[]) {
    const c = r.deal?.category_id;
    if (c) count.set(c, (count.get(c) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
}

export async function listFeedPage(opts: Opts): Promise<{ items: DealView[]; nextOffset: number | null }> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const nowIso = new Date().toISOString();

  let q = db()
    .from("deals_ranked").select(JOIN).eq("status", "published")
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.storeId) q = q.eq("store_id", opts.storeId);

  if (opts.viewerId) {
    const ignored = await ignoredAuthorIds(opts.viewerId);
    if (ignored.length) q = q.or(`author_id.is.null,author_id.not.in.(${ignored.join(",")})`);
  }

  let tab = opts.tab;
  if (tab === "paravoce") {
    if (!opts.viewerId) tab = "quentes";
    else {
      const [authors, cats] = await Promise.all([followedAuthorIds(opts.viewerId), favoriteCategories(opts.viewerId)]);
      const parts = [authors.length ? `author_id.in.(${authors.join(",")})` : "", cats.length ? `category_id.in.(${cats.join(",")})` : ""].filter(Boolean);
      if (parts.length) q = q.or(parts.join(","));
      tab = "quentes"; // dentro do recorte da pessoa, o que está mais quente vem primeiro
    }
  }

  if (tab === "novas") q = q.order("published_at", { ascending: false });
  else if (tab === "descontos") q = q.in("verdict", ["verified", "good_price"]).order("real_discount_bp", { ascending: false, nullsFirst: false });
  else q = q.order("hot_now", { ascending: false });

  // Pede 1 a mais para saber se existe próxima página.
  const { data, error } = await q.range(offset, offset + limit);
  if (error) throw error;
  const rows = data as unknown as DealJoinRow[];
  return { items: await toViews(rows.slice(0, limit), opts.viewerId), nextOffset: rows.length > limit ? offset + limit : null };
}

/** Ofertas com cupom, as mais quentes primeiro (bloco "melhores cupons" da lateral). */
export async function listCouponDeals(limit = 4): Promise<DealView[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db()
    .from("deals_ranked").select(JOIN).eq("status", "published").not("coupon_code", "is", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`).order("hot_now", { ascending: false }).limit(limit);
  if (error) throw error;
  return toViews(data as unknown as DealJoinRow[], null);
}

/** Categorias com mais ofertas no ar. */
export async function listPopularCategories(limit = 8): Promise<{ id: string; name: string; slug: string; count: number }[]> {
  const { data, error } = await db()
    .from("deals").select("category:categories(id, name, slug)").eq("status", "published").not("category_id", "is", null).limit(1000);
  if (error) throw error;
  const map = new Map<string, { id: string; name: string; slug: string; count: number }>();
  for (const r of data as unknown as { category: { id: string; name: string; slug: string } | null }[]) {
    if (!r.category) continue;
    const cur = map.get(r.category.id);
    if (cur) cur.count += 1;
    else map.set(r.category.id, { ...r.category, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

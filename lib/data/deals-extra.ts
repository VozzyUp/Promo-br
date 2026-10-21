// Consultas de ofertas além do feed (perfil, busca, categorias). Reaproveitam o formato do supabase.ts.
import "server-only";
import { db } from "../supabase/db";
import { JOIN, toViews, type DealJoinRow } from "./supabase";

export async function listDealsByAuthor(authorId: string, viewerId: string | null, limit = 20) {
  const { data, error } = await db()
    .from("deals").select(JOIN).eq("author_id", authorId).in("status", ["published", "expired"])
    .order("published_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return toViews(data as unknown as DealJoinRow[], viewerId);
}

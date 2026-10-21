// Configurações editáveis pelo painel (tabela site_settings), com cache curto em memória.
import "server-only";
import { db } from "../supabase/db";
import { supabaseEnabled } from "../supabase/server";

const TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; expires: number }>();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (!supabaseEnabled()) return fallback;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  try {
    const { data, error } = await db().from("site_settings").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    const value = ((data as { value: T } | null)?.value ?? fallback) as T;
    cache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  } catch (e) {
    console.error("[settings] leitura", key, e);
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown, userId: string | null): Promise<void> {
  const { error } = await db().from("site_settings").upsert({ key, value, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
  cache.delete(key);
}

export async function deleteSetting(key: string): Promise<void> {
  const { error } = await db().from("site_settings").delete().eq("key", key);
  if (error) throw error;
  cache.delete(key);
}

export type BrandSettings = { siteName: string; description: string; commissionNotice: string };
export type BfSettings = { enabled: boolean; title: string; text: string };
export type AdsSettings = { client: string; slot: string };

export const DEFAULT_BRAND: BrandSettings = {
  siteName: "promo-br",
  description: "Promoções, cupons e descontos de verdade, publicados e votados por quem entende de preço.",
  commissionNotice: "Alguns links nos pagam comissão quando você compra. Isso não muda a ordem nem o que aparece aqui: quem decide é a comunidade e o desconto real.",
};
export const DEFAULT_BF: BfSettings = { enabled: false, title: "Black Friday", text: "As ofertas com desconto conferido já estão aqui." };

/** Anúncios: o painel manda; se estiver vazio, vale o que veio do ambiente. */
export async function getAdsSettings(): Promise<AdsSettings> {
  const s = await getSetting<Partial<AdsSettings>>("public.ads", {});
  return { client: s.client || process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "", slot: s.slot || process.env.NEXT_PUBLIC_ADSENSE_SLOT || "" };
}
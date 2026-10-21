// Traz as vendas da Shopee e liga cada uma à oferta pelo subId (o código da oferta).
import "server-only";
import { getIntegrationConfig } from "../data/integrations";
import { conversionReport } from "../integrations/shopee";
import { db } from "../supabase/db";

export type SyncStats = { fetched: number; matched: number; skipped?: string };

export async function syncShopeeConversions(days = 3): Promise<SyncStats> {
  const cfg = await getIntegrationConfig<{ appId: string; secret: string }>("shopee");
  if (!cfg) return { fetched: 0, matched: 0, skipped: "integração da Shopee desligada" };
  const items = await conversionReport(cfg, new Date(Date.now() - days * 86400_000), new Date());
  if (items.length === 0) return { fetched: 0, matched: 0 };

  const subIds = [...new Set(items.map((i) => i.subId).filter((s): s is string => !!s))];
  const byCode = new Map<string, string>();
  if (subIds.length) {
    const deals = await db().from("deals").select("id, code").in("code", subIds);
    for (const d of (deals.data ?? []) as { id: string; code: string }[]) byCode.set(d.code, d.id);
  }
  const rows = items.map((i) => ({
    network: "shopee", order_ref: i.orderRef, sub_id: i.subId, deal_id: i.subId ? byCode.get(i.subId) ?? null : null,
    sale_cents: i.saleCents, commission_cents: i.commissionCents, status: i.status, occurred_at: i.occurredAt.toISOString(),
  }));
  const { error } = await db().from("conversions").upsert(rows, { onConflict: "network,order_ref" });
  if (error) throw error;

  // Contador por oferta (vendas que não foram canceladas)
  for (const dealId of new Set(rows.map((r) => r.deal_id).filter((x): x is string => !!x))) {
    const c = await db().from("conversions").select("id", { count: "exact", head: true }).eq("deal_id", dealId).neq("status", "cancelled");
    await db().from("deals").update({ conversions_total: c.count ?? 0 }).eq("id", dealId);
  }
  return { fetched: items.length, matched: rows.filter((r) => r.deal_id).length };
}
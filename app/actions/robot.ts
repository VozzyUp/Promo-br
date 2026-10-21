"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { parsePriceToCents } from "@/lib/format";
import { isValidCron } from "@/lib/jobs/cron";
import { db } from "@/lib/supabase/db";

export type RuleState = { ok?: boolean; error?: string } | undefined;

const UUID = /^[0-9a-f-]{36}$/i;

/** Cria ou atualiza uma regra do robô. Sem id = nova. */
export async function saveRuleAction(_prev: RuleState, form: FormData): Promise<RuleState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { error: "Dê um nome de 2 a 60 caracteres." };
  const cron = String(form.get("cron") ?? "").trim();
  if (!isValidCron(cron)) return { error: "Horário inválido. Use 5 campos, como 0 8,13,19 * * *." };
  const keywords = [...new Set(String(form.get("keywords") ?? "").split(/[\n,;]+/).map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 6);
  const num = (k: string, min: number, max: number) => {
    const v = Number(String(form.get(k) ?? "").replace(",", "."));
    return Number.isFinite(v) && v >= min && v <= max ? v : null;
  };
  const minDiscount = num("minDiscountPct", 0, 95);
  const minCommission = num("minCommissionPct", 0, 100);
  const perRun = num("perRun", 1, 50);
  if (minDiscount == null || minCommission == null || perRun == null) return { error: "Confira os números: desconto de 0 a 95, comissão de 0 a 100 e de 1 a 50 ofertas por rodada." };
  const maxPriceRaw = String(form.get("maxPrice") ?? "").trim();
  const maxPrice = maxPriceRaw ? parsePriceToCents(maxPriceRaw) : null;
  if (maxPriceRaw && maxPrice == null) return { error: "Preço máximo inválido." };
  const cat = String(form.get("categoryId") ?? "");

  const row = {
    name, source: "shopee", cron, keywords, active: form.get("active") === "on", auto_publish: form.get("autoPublish") === "on",
    min_discount_bp: Math.round(minDiscount * 100), min_commission_bp: Math.round(minCommission * 100),
    max_price_cents: maxPrice, per_run: Math.round(perRun), category_id: UUID.test(cat) ? cat : null,
  };
  const q = UUID.test(id) ? db().from("robot_rules").update(row).eq("id", id) : db().from("robot_rules").insert(row);
  const { error } = await q;
  if (error) return { error: error.message };
  revalidatePath("/painel/robo");
  return { ok: true };
}

export async function deleteRuleAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (UUID.test(id)) await db().from("robot_rules").delete().eq("id", id);
  revalidatePath("/painel/robo");
}
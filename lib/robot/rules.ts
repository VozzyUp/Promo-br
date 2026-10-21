// Regras de seleção do robô, sem rede, para poder testar.
import type { ShopeeOffer } from "../integrations/shopee-parse";

export type RuleLimits = { min_discount_bp: number; min_commission_bp: number; max_price_cents: number | null };

export const MIN_SALES = 10;
export const MIN_RATING = 4;

/** Aplica os limites da regra e os mínimos de qualidade a uma oferta vinda da API. */
export function passesRule(o: ShopeeOffer, r: RuleLimits): boolean {
  if (o.discountPct * 100 < r.min_discount_bp) return false;
  if (o.commissionBp < r.min_commission_bp) return false;
  if (r.max_price_cents != null && o.priceCents > r.max_price_cents) return false;
  if (o.sales < MIN_SALES) return false;
  if (o.rating > 0 && o.rating < MIN_RATING) return false;
  return o.title.length >= 10;
}

export const shopeeUrlKey = (itemId: string) => `shopee.com.br/item/${itemId}`;
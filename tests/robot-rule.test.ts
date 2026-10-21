import { describe, expect, it } from "vitest";
import type { ShopeeOffer } from "../lib/integrations/shopee-parse";

import { parseOffer, parseConversion } from "../lib/integrations/shopee-parse";
import { passesRule } from "../lib/robot/rules";

describe("shopee parseOffer", () => {
  it("converte preço em centavos e comissão em pontos-base", () => {
    const o = parseOffer({ itemId: 1, productName: "  Fone   Bluetooth  ", priceMin: "49.90", priceDiscountRate: 30, commissionRate: "0.08", sales: 120, ratingStar: "4.8", offerLink: "https://s/x", productLink: "https://shopee.com.br/p" }) as ShopeeOffer;
    expect(o.priceCents).toBe(4990);
    expect(o.commissionBp).toBe(800);
    expect(o.title).toBe("Fone Bluetooth");
    expect(o.rating).toBe(4.8);
  });

  it("descarta item sem preço ou sem link", () => {
    expect(parseOffer({ itemId: 2, productName: "x", priceMin: "0", offerLink: "a", productLink: "b" })).toBeNull();
    expect(parseOffer({ itemId: 3, productName: "x", priceMin: "10" })).toBeNull();
  });
});

describe("shopee parseConversion", () => {
  it("soma os itens, lê o subId e traduz o status", () => {
    const c = parseConversion({
      purchaseTime: 1_800_000_000, conversionId: 99, conversionStatus: "COMPLETED", totalCommission: "3.50", utmContent: "abc123",
      orders: [{ orderId: "o1", items: [{ actualAmount: "40.00" }, { actualAmount: "10.50" }] }],
    });
    expect(c.saleCents).toBe(5050);
    expect(c.commissionCents).toBe(350);
    expect(c.subId).toBe("abc123");
    expect(c.status).toBe("approved");
    expect(c.orderRef).toBe("99");
  });

  it("cancelada", () => {
    expect(parseConversion({ purchaseTime: 1, conversionId: 1, conversionStatus: "CANCELLED" }).status).toBe("cancelled");
  });
});
describe("passesRule", () => {
  const base = { itemId: "1", title: "Fone Bluetooth Sem Fio", priceCents: 5000, discountPct: 30, commissionBp: 800, sales: 100, rating: 4.7, imageUrl: null, shopName: null, productLink: "a", offerLink: "b" };
  const rule = { min_discount_bp: 2000, min_commission_bp: 500, max_price_cents: 10000 };

  it("aceita quem cumpre tudo", () => expect(passesRule(base, rule)).toBe(true));
  it("recusa desconto baixo", () => expect(passesRule({ ...base, discountPct: 10 }, rule)).toBe(false));
  it("recusa comissão baixa", () => expect(passesRule({ ...base, commissionBp: 100 }, rule)).toBe(false));
  it("recusa preço acima do máximo", () => expect(passesRule({ ...base, priceCents: 20000 }, rule)).toBe(false));
  it("recusa poucas vendas e nota baixa", () => {
    expect(passesRule({ ...base, sales: 2 }, rule)).toBe(false);
    expect(passesRule({ ...base, rating: 3.2 }, rule)).toBe(false);
  });
  it("sem nota ainda passa", () => expect(passesRule({ ...base, rating: 0 }, rule)).toBe(true));
});
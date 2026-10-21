import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATE, dealMeetsChannel, effectiveDiscountBp, inSendWindow, renderMessage, type DispatchDeal } from "../lib/dispatch/format";

const deal: DispatchDeal = {
  title: "Fone <Pro> & Cia", slug: "fone", code: "abc", storeName: "Shopee", priceCents: 5000, listPriceCents: 10000,
  couponCode: null, couponPercent: null, verdict: "no_comparison", realDiscountBp: null,
};

describe("dealMeetsChannel", () => {
  it("any aceita sem selo se o desconto bate", () => {
    expect(dealMeetsChannel(deal, { min_verdict: "any", min_discount_bp: 2000 })).toBe(true);
    expect(dealMeetsChannel(deal, { min_verdict: "any", min_discount_bp: 6000 })).toBe(false);
  });
  it("verified exige o selo; inflado nunca vai", () => {
    expect(dealMeetsChannel(deal, { min_verdict: "verified", min_discount_bp: 0 })).toBe(false);
    expect(dealMeetsChannel({ ...deal, verdict: "verified" }, { min_verdict: "verified", min_discount_bp: 0 })).toBe(true);
    expect(dealMeetsChannel({ ...deal, verdict: "inflated" }, { min_verdict: "any", min_discount_bp: 0 })).toBe(false);
  });
  it("usa o desconto real quando existe e o do cupom sem preço", () => {
    expect(effectiveDiscountBp({ ...deal, realDiscountBp: 1234 })).toBe(1234);
    expect(effectiveDiscountBp({ ...deal, priceCents: null, couponPercent: 15 })).toBe(1500);
  });
});

describe("inSendWindow", () => {
  it("janela normal em Brasília", () => {
    expect(inSendWindow(new Date("2026-11-27T13:00:00Z"), "08:00", "22:00")).toBe(true); // 10h
    expect(inSendWindow(new Date("2026-11-27T02:00:00Z"), "08:00", "22:00")).toBe(false); // 23h do dia anterior
  });
  it("janela que cruza a meia-noite", () => {
    expect(inSendWindow(new Date("2026-11-27T02:00:00Z"), "20:00", "02:00")).toBe(true); // 23h
    expect(inSendWindow(new Date("2026-11-27T12:00:00Z"), "20:00", "02:00")).toBe(false); // 9h
  });
});

describe("renderMessage", () => {
  it("telegram escapa HTML e põe negrito", () => {
    const m = renderMessage(DEFAULT_TEMPLATE, deal, "https://x.com/oferta/fone", "telegram");
    expect(m).toContain("<b>Fone &lt;Pro&gt; &amp; Cia</b>");
    expect(m).toContain("https://x.com/oferta/fone");
    expect(m).not.toMatch(/\{\w+\}/);
  });
  it("whatsapp mantém o asterisco e não escapa", () => {
    const m = renderMessage(DEFAULT_TEMPLATE, deal, "https://x", "whatsapp");
    expect(m).toContain("*Fone <Pro> & Cia*");
  });
  it("remove linhas vazias (sem cupom, sem selo)", () => {
    const m = renderMessage(DEFAULT_TEMPLATE, deal, "https://x", "whatsapp");
    expect(m.split("\n").every((l) => l.trim() !== "")).toBe(true);
  });
});
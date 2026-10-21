import { describe, expect, it } from "vitest";
import { checkPrice, priceRoseTwice } from "../lib/price-check";

const now = new Date("2026-11-10T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);
const hist = (...pairs: [number, number][]) => pairs.map(([d, p]) => ({ priceCents: p, at: daysAgo(d) }));

describe("checkPrice", () => {
  it("sem histórico não compara", () => {
    expect(checkPrice({ priceCents: 5000, listPriceCents: null, history: [], now }).verdict).toBe("no_comparison");
  });

  it("histórico curto não verifica, mas mostra a referência", () => {
    const r = checkPrice({ priceCents: 8000, listPriceCents: null, history: hist([2, 10000], [1, 10000]), now });
    expect(r.verdict).toBe("no_comparison");
    expect(r.referenceCents).toBe(10000);
  });

  it("desconto real de 20% com 10 dias de histórico e menor preço: verificado", () => {
    const r = checkPrice({ priceCents: 8000, listPriceCents: 12000, history: hist([10, 10000], [6, 10000], [2, 10200]), now });
    expect(r.verdict).toBe("verified");
    expect(r.realDiscountBp).toBe(2000);
    expect(r.historyDays).toBe(10);
  });

  it("desconto de 6%: bom preço", () => {
    const r = checkPrice({ priceCents: 9400, listPriceCents: null, history: hist([12, 10000], [5, 10000]), now });
    expect(r.verdict).toBe("good_price");
  });

  it("o de da loja 50% acima da referência e preço igual ao de sempre: inflado", () => {
    const r = checkPrice({ priceCents: 10000, listPriceCents: 15000, history: hist([20, 10000], [10, 10000]), now });
    expect(r.verdict).toBe("inflated");
  });

  it("ignora preços com mais de 30 dias", () => {
    const r = checkPrice({ priceCents: 8000, listPriceCents: null, history: hist([60, 20000]), now });
    expect(r.verdict).toBe("no_comparison");
    expect(r.referenceCents).toBeNull();
  });
});

describe("priceRoseTwice", () => {
  it("só conta quando as duas últimas checagens passam da tolerância", () => {
    expect(priceRoseTwice(10000, [12000, 11800])).toBe(true);
    expect(priceRoseTwice(10000, [12000, 10100])).toBe(false);
    expect(priceRoseTwice(10000, [12000])).toBe(false);
  });
});
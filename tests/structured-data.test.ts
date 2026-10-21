import { describe, expect, it } from "vitest";
import { dealJsonLd, jsonLdScript } from "../lib/structured-data";
import type { DealView } from "../lib/types";

const base = {
  title: "Fone Bluetooth", slug: "fone", priceCents: 19990, status: "published", expiresAt: null, imageUrl: "https://x/i.jpg",
  description: "Boa oferta", store: { name: "Amazon" },
} as unknown as DealView;

describe("dealJsonLd", () => {
  it("monta Product e Offer com preço em reais com duas casas", () => {
    const d = dealJsonLd(base, "https://site.com/")!;
    const o = d.offers as Record<string, string>;
    expect(d["@type"]).toBe("Product");
    expect(o.price).toBe("199.90");
    expect(o.priceCurrency).toBe("BRL");
    expect(o.url).toBe("https://site.com/oferta/fone");
    expect(o.availability).toContain("InStock");
  });
  it("oferta expirada vira OutOfStock", () => {
    const d = dealJsonLd({ ...base, status: "expired" }, "https://site.com")!;
    expect((d.offers as Record<string, string>).availability).toContain("OutOfStock");
  });
  it("sem preço (cupom) ou fora do ar não gera dados", () => {
    expect(dealJsonLd({ ...base, priceCents: null }, "https://site.com")).toBeNull();
    expect(dealJsonLd({ ...base, status: "pending" }, "https://site.com")).toBeNull();
  });
  it("o script nunca contém < para fechar a tag", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)" })).not.toContain("<");
  });
});
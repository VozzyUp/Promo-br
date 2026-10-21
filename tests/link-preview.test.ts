import { describe, expect, it } from "vitest";
import { parsePreview, priceToCents } from "../lib/link-preview-parse";

describe("priceToCents", () => {
  it("entende os formatos de preço", () => {
    expect(priceToCents("199,90")).toBe(19990);
    expect(priceToCents("1.299,90")).toBe(129990);
    expect(priceToCents("1299.90")).toBe(129990);
    expect(priceToCents("R$ 2.500")).toBe(250000);
    expect(priceToCents("1,299.90")).toBe(129990);
    expect(priceToCents(49.9)).toBe(4990);
    expect(priceToCents("199")).toBe(19900);
  });

  it("recusa o que não é preço", () => {
    expect(priceToCents("")).toBeNull();
    expect(priceToCents("grátis")).toBeNull();
    expect(priceToCents(null)).toBeNull();
    expect(priceToCents(-5)).toBeNull();
  });
});

describe("parsePreview", () => {
  const base = "https://www.loja.com.br/produto/x";

  it("lê og:title, og:image (relativa) e meta de preço", () => {
    const html = `<html><head><title>Loja - Fone</title>
      <meta property="og:title" content="Fone Bluetooth &amp; Cia">
      <meta property="og:image" content="/img/fone.jpg">
      <meta property="product:price:amount" content="199.90">
      <meta property="product:price:currency" content="BRL"></head></html>`;
    expect(parsePreview(html, base)).toEqual({
      title: "Fone Bluetooth & Cia", imageUrl: "https://www.loja.com.br/img/fone.jpg", priceCents: 19990, currency: "BRL",
    });
  });

  it("usa JSON-LD de produto quando não há meta", () => {
    const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: "Air fryer 5 L", image: ["https://cdn.loja.com/a.jpg"], offers: { "@type": "Offer", price: "329.00", priceCurrency: "BRL" } });
    const p = parsePreview(`<script type="application/ld+json">${ld}</script>`, base);
    expect(p).toMatchObject({ title: "Air fryer 5 L", imageUrl: "https://cdn.loja.com/a.jpg", priceCents: 32900, currency: "BRL" });
  });

  it("acha o produto dentro de @graph e de listas de ofertas", () => {
    const ld = JSON.stringify({ "@graph": [{ "@type": "WebSite" }, { "@type": ["Product"], name: "TV", offers: [{ lowPrice: "1999,00" }] }] });
    expect(parsePreview(`<script type="application/ld+json">${ld}</script>`, base).priceCents).toBe(199900);
  });

  it("descarta preço em outra moeda", () => {
    const html = '<meta property="og:price:amount" content="29.90"><meta property="og:price:currency" content="USD">';
    expect(parsePreview(html, base).priceCents).toBeNull();
  });

  it("ignora imagem com esquema perigoso e JSON-LD quebrado", () => {
    const html = '<meta property="og:image" content="javascript:alert(1)"><script type="application/ld+json">{quebrado</script>';
    const p = parsePreview(html, base);
    expect(p.imageUrl).toBeNull();
    expect(p.title).toBeNull();
  });

  it("corta título muito longo", () => {
    expect(parsePreview(`<meta property="og:title" content="${"a".repeat(300)}">`, base).title).toHaveLength(140);
  });
});

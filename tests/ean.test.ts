import { describe, expect, it } from "vitest";
import { normalizeGtin } from "../lib/ean";
import { parsePreview } from "../lib/link-preview-parse";

describe("GTIN", () => {
  it("aceita EAN-13, UPC-A, EAN-8 e GTIN-14 válidos", () => {
    expect(normalizeGtin("7891000100103")).toBe("7891000100103"); // EAN-13
    expect(normalizeGtin("036000291452")).toBe("036000291452"); // UPC-A
    expect(normalizeGtin("96385074")).toBe("96385074"); // EAN-8
    expect(normalizeGtin("10012345678902")).toBe("10012345678902"); // GTIN-14
  });
  it("tira espaços e hífens e aceita número", () => {
    expect(normalizeGtin(" 789 1000-100103 ")).toBe("7891000100103");
    expect(normalizeGtin(96385074)).toBe("96385074");
  });
  it("recusa dígito verificador errado, tamanho errado, letras e zeros", () => {
    expect(normalizeGtin("7891000100104")).toBeNull();
    expect(normalizeGtin("12345")).toBeNull();
    expect(normalizeGtin("78910001001ab")).toBeNull();
    expect(normalizeGtin("0000000000000")).toBeNull();
    expect(normalizeGtin(null)).toBeNull();
  });
});

describe("GTIN no preview do link", () => {
  const page = (body: string) => `<html><head><title>x</title>${body}</head></html>`;
  it("lê gtin13 do JSON-LD de produto", () => {
    const html = page(`<script type="application/ld+json">{"@type":"Product","name":"Fone","gtin13":"7891000100103","offers":{"price":"99.90","priceCurrency":"BRL"}}</script>`);
    expect(parsePreview(html, "https://loja.test/p").gtin).toBe("7891000100103");
  });
  it("lê de meta product:ean e ignora código inválido", () => {
    expect(parsePreview(page(`<meta property="product:ean" content="7891000100103">`), "https://loja.test/p").gtin).toBe("7891000100103");
    expect(parsePreview(page(`<meta property="product:ean" content="1234567890123">`), "https://loja.test/p").gtin).toBeUndefined();
  });
});
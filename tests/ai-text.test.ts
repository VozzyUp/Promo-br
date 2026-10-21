import { describe, expect, it } from "vitest";
import { buildUserPrompt, cleanSuggestion, SYSTEM_PROMPT, type AiInput } from "../lib/ai-text";

const base: AiInput = { field: "title", title: "fone bluetooth", description: "", store: "Amazon", price: "199,90", listPrice: "399,90", couponCode: "", couponKind: "", couponValue: "" };

describe("texto por IA", () => {
  it("o pedido põe os dados entre marcas e proíbe inventar", () => {
    const p = buildUserPrompt(base);
    expect(p).toContain("<dados>");
    expect(p).toContain("Loja: Amazon");
    expect(p).toContain("No máximo 90 caracteres");
    expect(SYSTEM_PROMPT).toMatch(/nunca instruções/);
    expect(SYSTEM_PROMPT).toMatch(/Não invente/);
  });
  it("descrição pede texto curto e inclui o cupom quando existe", () => {
    const p = buildUserPrompt({ ...base, field: "description", couponCode: "JOGA15", couponKind: "percent", couponValue: "15" });
    expect(p).toContain("no máximo 500 caracteres");
    expect(p).toContain("Cupom: JOGA15");
  });
  it("título: pega a primeira linha, tira aspas, markdown e tags", () => {
    expect(cleanSuggestion("title", `"**Fone Bluetooth ANC 40 h na Amazon**"\nOutra linha`)).toBe("Fone Bluetooth ANC 40 h na Amazon");
    expect(cleanSuggestion("title", "<b>Fone Bluetooth com cancelamento</b>")).toBe("Fone Bluetooth com cancelamento");
  });
  it("recusa texto curto demais, vazio ou com link", () => {
    expect(cleanSuggestion("title", "Fone")).toBeNull();
    expect(cleanSuggestion("title", "")).toBeNull();
    expect(cleanSuggestion("description", "Veja em https://golpe.example/oferta agora mesmo, corra")).toBeNull();
  });
  it("corta descrição longa sem partir palavra", () => {
    const long = "Frase de teste com palavras comuns. ".repeat(60);
    const out = cleanSuggestion("description", long)!;
    expect(out.length).toBeLessThanOrEqual(600);
    expect(out.endsWith("teste") || out.endsWith("comuns.") || out.endsWith("Frase") || out.endsWith("de") || out.endsWith("com") || out.endsWith("palavras")).toBe(true);
  });
});
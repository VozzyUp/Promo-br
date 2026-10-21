import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, mergeWeights, parseWeights } from "../lib/ranking";

const form = (o: Record<string, string>) => (k: string) => o[k] ?? "";
const base = { votes: "1,5", clicks: "4", discount: "0.5", verified: "8", boost: "30", decay: "1.5" };

describe("pesos do ranking", () => {
  it("aceita vírgula decimal e devolve os números", () => {
    expect(parseWeights(form(base))).toEqual({ weights: DEFAULT_WEIGHTS });
  });
  it("recusa valor fora do limite com mensagem em português", () => {
    const r = parseWeights(form({ ...base, decay: "9" }));
    expect("error" in r && r.error).toMatch(/velocidade.*entre 0.5 e 3/i);
  });
  it("recusa campo vazio ou texto", () => {
    expect("error" in parseWeights(form({ ...base, votes: "" }))).toBe(true);
    expect("error" in parseWeights(form({ ...base, clicks: "muito" }))).toBe(true);
  });
  it("mergeWeights usa o padrão para o que falta ou é inválido", () => {
    expect(mergeWeights({ votes: 3, clicks: "x" })).toEqual({ ...DEFAULT_WEIGHTS, votes: 3 });
    expect(mergeWeights(null)).toEqual(DEFAULT_WEIGHTS);
  });
});

import { describe, expect, it } from "vitest";
import { parseInline, parseLegal } from "../lib/legal-text";

describe("parseLegal", () => {
  it("separa título, parágrafo e lista", () => {
    const b = parseLegal("Olá\n\n## Seção\n- um\n- dois\n\nFim");
    expect(b.map((x) => x.kind)).toEqual(["p", "h2", "ul", "p"]);
    expect(b[2].kind === "ul" && b[2].items).toHaveLength(2);
  });
});

describe("parseInline", () => {
  it("negrito e link interno", () => {
    const i = parseInline("veja **isto** em [termos](/termos)");
    expect(i.map((x) => x.kind)).toEqual(["text", "bold", "text", "link"]);
  });
  it("aceita https e recusa javascript:", () => {
    expect(parseInline("[a](https://ex.com/x)")[0].kind).toBe("link");
    const bad = parseInline("[clique](javascript:alert(1))");
    expect(bad.every((x) => x.kind !== "link")).toBe(true);
  });
  it("recusa http sem s e endereço sem barra", () => {
    expect(parseInline("[a](http://ex.com)").some((x) => x.kind === "link")).toBe(false);
    expect(parseInline("[a](ex.com)").some((x) => x.kind === "link")).toBe(false);
  });
});
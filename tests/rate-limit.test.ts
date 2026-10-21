import { describe, expect, it } from "vitest";
import { createLimiter } from "../lib/rate-limit";

describe("createLimiter", () => {
  it("deixa passar até o máximo e depois bloqueia com o tempo de espera", () => {
    const l = createLimiter({ max: 3, windowMs: 60_000 });
    for (let i = 0; i < 3; i++) expect(l.hit("a", 1000 + i).ok).toBe(true);
    const r = l.hit("a", 2000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBe(59);
  });
  it("chaves diferentes não se misturam", () => {
    const l = createLimiter({ max: 1, windowMs: 60_000 });
    expect(l.hit("a", 0).ok).toBe(true);
    expect(l.hit("b", 0).ok).toBe(true);
    expect(l.hit("a", 1).ok).toBe(false);
  });
  it("libera de novo depois da janela", () => {
    const l = createLimiter({ max: 1, windowMs: 1000 });
    expect(l.hit("a", 0).ok).toBe(true);
    expect(l.hit("a", 500).ok).toBe(false);
    expect(l.hit("a", 1500).ok).toBe(true);
  });
  it("não cresce sem limite", () => {
    const l = createLimiter({ max: 1, windowMs: 60_000, maxKeys: 10 });
    for (let i = 0; i < 100; i++) l.hit(`k${i}`, i);
    expect(l.hit("k99", 200).ok).toBe(false); // as mais novas continuam lembradas
  });
});
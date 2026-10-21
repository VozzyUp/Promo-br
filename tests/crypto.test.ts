import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptJson, encryptJson, hasMasterKey } from "../lib/crypto";

const KEY = "a".repeat(64);
let old: string | undefined;
beforeEach(() => { old = process.env.MASTER_KEY; process.env.MASTER_KEY = KEY; });
afterEach(() => { if (old === undefined) delete process.env.MASTER_KEY; else process.env.MASTER_KEY = old; });

describe("crypto", () => {
  it("ida e volta", () => {
    const enc = encryptJson({ secret: "abc", n: 1 });
    expect(enc.split(":")).toHaveLength(3);
    expect(enc).not.toContain("abc");
    expect(decryptJson(enc)).toEqual({ secret: "abc", n: 1 });
  });

  it("cada cifra usa um iv novo", () => {
    expect(encryptJson("x")).not.toBe(encryptJson("x"));
  });

  it("chave errada não decifra", () => {
    const enc = encryptJson("x");
    process.env.MASTER_KEY = "b".repeat(64);
    expect(() => decryptJson(enc)).toThrow();
  });

  it("sem chave válida avisa", () => {
    process.env.MASTER_KEY = "curta";
    expect(hasMasterKey()).toBe(false);
    expect(() => encryptJson("x")).toThrow(/MASTER_KEY/);
  });
});
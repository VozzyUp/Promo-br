import { describe, expect, it } from "vitest";
import { extractMentions } from "../lib/mentions";

describe("extractMentions", () => {
  it("acha menções, em minúsculas e sem repetir", () => {
    expect(extractMentions("oi @Ana_01 e @ana_01, falei com @bruno")).toEqual(["ana_01", "bruno"]);
  });

  it("ignora e-mail e nomes curtos demais", () => {
    expect(extractMentions("mande para x@exemplo.com ou @ab")).toEqual([]);
  });

  it("limita a 10 menções", () => {
    const text = Array.from({ length: 15 }, (_, i) => `@pessoa${i + 100}`).join(" ");
    expect(extractMentions(text)).toHaveLength(10);
  });
});

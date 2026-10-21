import { describe, expect, it } from "vitest";
import { confirmationMail, digestMail, escapeHtml, isValidEmail, normalizeEmail } from "../lib/newsletter";

describe("e-mail do boletim", () => {
  it("normaliza e valida", () => {
    expect(normalizeEmail("  Ana@Exemplo.COM ")).toBe("ana@exemplo.com");
    expect(isValidEmail("ana@exemplo.com")).toBe(true);
    for (const bad of ["", "ana", "ana@", "@exemplo.com", "ana@exemplo", "a b@c.com", "a<b>@c.com"]) expect(isValidEmail(bad)).toBe(false);
  });
  it("escapa HTML", () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
  });
  it("o resumo usa singular, limita a 8 e escapa o título", () => {
    const deal = (i: number, title = `Oferta ${i}`) => ({ title, url: `https://x.test/oferta/${i}`, priceCents: 9990, couponCode: null, store: "Loja", discountPct: 20 });
    const one = digestMail({ siteName: "Site", siteUrl: "https://x.test", deals: [deal(1, "<b>Fone</b>")], unsubscribeUrl: "https://x.test/boletim/sair?t=1" });
    expect(one.subject).toBe("A oferta mais quente da semana");
    expect(one.html).toContain("&lt;b&gt;Fone&lt;/b&gt;");
    expect(one.html).not.toContain("<b>Fone</b>");
    expect(one.text).toContain("R$");
    const many = digestMail({ siteName: "Site", siteUrl: "https://x.test", deals: Array.from({ length: 12 }, (_, i) => deal(i)), unsubscribeUrl: "u" });
    expect(many.subject).toBe("As 8 ofertas mais quentes da semana");
  });
  it("cupom sem preço mostra o código", () => {
    const m = digestMail({ siteName: "S", siteUrl: "https://x.test", deals: [{ title: "Cupom", url: "https://x.test/o", priceCents: null, couponCode: "JOGA15", store: "L", discountPct: null }], unsubscribeUrl: "u" });
    expect(m.text).toContain("cupom JOGA15");
  });
  it("a confirmação leva o link e explica o que acontece se não foi a pessoa", () => {
    const m = confirmationMail({ siteName: "S", confirmUrl: "https://x.test/boletim/confirmar?t=abc" });
    expect(m.text).toContain("https://x.test/boletim/confirmar?t=abc");
    expect(m.text).toMatch(/ignore/i);
  });
});
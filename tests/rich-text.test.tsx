import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText, stripRichText } from "../lib/rich-text";

const html = (text: string) => renderToStaticMarkup(createElement(RichText, { text }));

describe("RichText", () => {
  it("aplica negrito, itálico e tachado", () => {
    const out = html("**forte** e *leve* e ~~riscado~~");
    expect(out).toContain("<strong>forte</strong>");
    expect(out).toContain("<em>leve</em>");
    expect(out).toContain("<s>riscado</s>");
  });

  it("escapa HTML e script: nada vira marcação", () => {
    const out = html('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("links externos levam nofollow ugc e abrem em nova aba", () => {
    const out = html("veja [a oferta](https://loja.com.br/p?id=1) ou https://outra.com/x");
    expect(out).toContain('href="https://loja.com.br/p?id=1"');
    expect(out).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('href="https://outra.com/x"');
  });

  it("não cria link para javascript:, data: nem ftp:", () => {
    for (const bad of ["[x](javascript:alert(1))", "[x](data:text/html,hi)", "[x](ftp://a.com/b)"]) {
      expect(html(bad)).not.toContain("<a ");
    }
  });

  it("menção vira link interno para o perfil, em minúsculas", () => {
    const out = html("oi @Maria_Souza tudo bem?");
    expect(out).toContain('href="/u/maria_souza"');
    expect(out).toContain("@Maria_Souza");
  });

  it("e-mail não vira menção", () => {
    expect(html("fale com joao@exemplo.com")).not.toContain('href="/u/');
  });

  it("monta listas e linhas separadoras", () => {
    const out = html("- um\n- dois\n\n---\n\nfim");
    expect(out).toContain("<ul");
    expect(out.match(/<li>/g)).toHaveLength(2);
    expect(out).toContain("<hr");
  });

  it("não quebra com marcação mal fechada", () => {
    expect(() => html("**sem fim e [link quebrado](https://")).not.toThrow();
  });
});

describe("stripRichText", () => {
  it("tira a marcação e corta no limite", () => {
    expect(stripRichText("**oi** [site](https://a.com)\n- item")).toBe("oi site item");
    expect(stripRichText("a".repeat(300), 50)).toHaveLength(50);
  });
});

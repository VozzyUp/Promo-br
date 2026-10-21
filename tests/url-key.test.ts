import { describe, expect, it } from "vitest";
import { urlKey } from "../lib/url-key";

const key = (u: string) => urlKey(new URL(u));

describe("urlKey", () => {
  it("ignora tag de afiliado, rastreadores e www", () => {
    const a = key("https://www.loja.com.br/produto/tenis-x?utm_source=zap&tag=autor-20");
    const b = key("https://loja.com.br/produto/tenis-x/?ref=abc");
    expect(a).toBe(b);
  });

  it("Amazon: o ASIN manda, o título no caminho não", () => {
    expect(key("https://www.amazon.com.br/Fone-Bluetooth/dp/B0CHX1W1XY/ref=sr_1_1?tag=a-20")).toBe(key("https://amazon.com.br/dp/b0chx1w1xy"));
  });

  it("Mercado Livre: o código MLB manda", () => {
    expect(key("https://www.mercadolivre.com.br/tenis-corrida-x/p/MLB12345678?pdp_filters=a")).toBe(
      key("https://produto.mercadolivre.com.br/MLB-12345678-tenis-corrida-x-_JM"),
    );
  });

  it("mantém parâmetros que identificam o produto", () => {
    expect(key("https://loja.com.br/p.php?id=10&utm_medium=x")).toBe("loja.com.br/p.php?id=10");
    expect(key("https://loja.com.br/p.php?id=10")).not.toBe(key("https://loja.com.br/p.php?id=11"));
  });

  it("produtos diferentes têm chaves diferentes", () => {
    expect(key("https://loja.com.br/a")).not.toBe(key("https://loja.com.br/b"));
    expect(key("https://loja.com.br/a")).not.toBe(key("https://outra.com.br/a"));
  });
});

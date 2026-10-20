import { describe, expect, it } from "vitest";
import { checkSubmittedUrl, findStoreForHost, safeNext } from "../lib/links";

describe("safeNext", () => {
  it("aceita caminhos internos", () => {
    expect(safeNext("/publicar")).toBe("/publicar");
    expect(safeNext("/oferta/abc-1234?enviada=1")).toBe("/oferta/abc-1234?enviada=1");
  });
  it("bloqueia redirecionamento para fora", () => {
    for (const bad of ["//evil.com", String.raw`/\evil.com`, "https://evil.com", "javascript:alert(1)", "", null, undefined, "/ x"]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

describe("checkSubmittedUrl", () => {
  it("mantém o link do autor intacto, com a tag de afiliado", () => {
    const r = checkSubmittedUrl("https://www.amazon.com.br/dp/X1?tag=autor-20");
    expect(r.ok && r.url.toString()).toBe("https://www.amazon.com.br/dp/X1?tag=autor-20");
    expect(r.ok && r.host).toBe("amazon.com.br");
  });
  it("recusa esquemas e endereços internos", () => {
    for (const bad of ["ftp://loja.com", "javascript:alert(1)", "http://localhost:3000", "http://192.168.0.1", "http://10.0.0.5", "http://8.8.8.8", "nao é url"]) {
      expect(checkSubmittedUrl(bad).ok).toBe(false);
    }
  });
});

describe("findStoreForHost", () => {
  const stores = [{ id: "a", name: "Amazon", slug: "amazon", domains: ["amazon.com.br", "amzn.to"], status: "active" as const }];
  it("acha loja por domínio e subdomínio, sem casar sufixo solto", () => {
    expect(findStoreForHost("amazon.com.br", stores)?.id).toBe("a");
    expect(findStoreForHost("m.amazon.com.br", stores)?.id).toBe("a");
    expect(findStoreForHost("fakeamazon.com.br", stores)).toBeUndefined();
  });
});

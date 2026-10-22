import { describe, expect, it } from "vitest";
import { cleanStoreUrl, extractLinks, isProductUrl, mercadoLivreFeatured, redirectTarget } from "../lib/sources/clean-url";
import { resolveStoreLink, type Fetched } from "../lib/sources/resolve";

const U = (s: string) => new URL(s);
const clean = (s: string) => cleanStoreUrl(U(s)).toString();

describe("limpeza do link (sem afiliado de terceiros)", () => {
  it("Amazon vira /dp/ASIN", () => {
    expect(clean("https://www.amazon.com.br/Smart-TV-Philco/dp/B0CXYZ1234/ref=sr_1_1?tag=outrogrupo-20&linkCode=ll1&th=1")).toBe("https://www.amazon.com.br/dp/B0CXYZ1234");
    expect(clean("https://amazon.com.br/gp/product/b0cxyz1234?tag=x-20")).toBe("https://amazon.com.br/dp/B0CXYZ1234");
  });
  it("Mercado Livre e Shopee perdem os parâmetros de afiliado", () => {
    expect(clean("https://www.mercadolivre.com.br/furadeira-wap/p/MLB46208531?matt_tool=20184732&matt_word=x&forceInApp=true#polycard_client=x")).toBe("https://www.mercadolivre.com.br/furadeira-wap/p/MLB46208531");
    expect(clean("https://shopee.com.br/Fone-Bluetooth-i.123456.789012?mmp_pid=an_183&utm_source=an_183&uls_trackid=abc")).toBe("https://shopee.com.br/Fone-Bluetooth-i.123456.789012");
  });
  it("vitrine do Parceiro Magalu vira o produto na Magalu", () => {
    expect(clean("https://www.magazinevoce.com.br/magazinefulano/geladeira-brastemp/p/237589800/?utm_source=x")).toBe("https://www.magazineluiza.com.br/geladeira-brastemp/p/237589800/");
  });
  it("loja desconhecida: tira só os rastreadores e mantém o que identifica o produto", () => {
    expect(clean("https://loja.exemplo.com.br/produto?id=55&utm_source=tg&aff_id=9&ref=grupo")).toBe("https://loja.exemplo.com.br/produto?id=55");
  });
});

describe("reconhecer página de produto", () => {
  it("produto sim; home, cadastro Prime, vitrine de afiliado e cupons não", () => {
    expect(isProductUrl(U("https://www.amazon.com.br/dp/B0CXYZ1234"))).toBe(true);
    expect(isProductUrl(U("https://www.amazon.com.br/amazonprime?tag=x"))).toBe(false);
    expect(isProductUrl(U("https://produto.mercadolivre.com.br/MLB-1234567890-fone-_JM"))).toBe(true);
    expect(isProductUrl(U("https://www.mercadolivre.com.br/social/promotop?ref=abc"))).toBe(false);
    expect(isProductUrl(U("https://shopee.com.br/user/voucher-wallet?x=1"))).toBe(false);
    expect(isProductUrl(U("https://www.kabum.com.br/produto/123456/ssd-kingston"))).toBe(true);
    expect(isProductUrl(U("https://www.kabum.com.br/"))).toBe(false);
  });
});

describe("destino escondido", () => {
  it("rede de afiliados com o destino no parâmetro", () => {
    expect(redirectTarget(U("https://www.awin1.com/cread.php?awinmid=17729&awinaffid=1&ued=https%3A%2F%2Fwww.kabum.com.br%2Fproduto%2F123456%2Fssd"))?.toString()).toBe("https://www.kabum.com.br/produto/123456/ssd");
    expect(redirectTarget(U("https://www.kabum.com.br/produto/1"))).toBeNull();
  });
  it("links de uma página intermediária, inclusive redirecionamento por meta e script", () => {
    const html = `<meta http-equiv="refresh" content="3;url=https://amzn.to/abc"><script>window.location.href = "https:\\/\\/www.amazon.com.br\\/dp\\/B0CXYZ1234?tag=x"</script><a href="/outra">x</a>`;
    const got = extractLinks(html, U("https://promos.exemplo/ofertas/1")).map(String);
    expect(got).toEqual(expect.arrayContaining(["https://amzn.to/abc", "https://www.amazon.com.br/dp/B0CXYZ1234?tag=x", "https://promos.exemplo/outra"]));
  });
  it("vitrine do Mercado Livre: usa o card em destaque, não as recomendações", () => {
    const html = `<a href="https://www.mercadolivre.com.br/outro/p/MLB79735337?x=1#reco_client=home_affiliate_profile_v2p">r</a>
      <a href="https://www.mercadolivre.com.br/furadeira/p/MLB46208531?matt_tool=1#polycard_client=x&amp;c_id=/home/card-featured/element">f</a>`;
    expect(mercadoLivreFeatured(html, U("https://www.mercadolivre.com.br/social/promotop"))?.pathname).toBe("/furadeira/p/MLB46208531");
  });
});

const STORES = ["amazon.com.br", "amzn.to", "mercadolivre.com.br", "mercadolivre.com", "meli.la", "kabum.com.br"];
const isStore = (h: string) => STORES.some((s) => h === s || h.endsWith(`.${s}`));

function fakeNet(map: Record<string, { to?: string; status?: number; html?: string }>) {
  const calls: string[] = [];
  const fetcher = async (u: URL): Promise<Fetched> => {
    calls.push(u.toString());
    let cur = u.toString();
    for (let i = 0; i < 5 && map[cur]?.to; i++) cur = map[cur].to!;
    const r = map[cur];
    if (!r) throw new Error("sem rede");
    return { status: r.status ?? 200, url: new URL(cur), html: r.html ?? null };
  };
  return { fetcher, calls };
}

describe("do link da publicação até o produto", () => {
  it("link direto da loja: sem rede nenhuma", async () => {
    const net = fakeNet({});
    const r = await resolveStoreLink(["https://www.amazon.com.br/dp/B0CXYZ1234?tag=outro-20"], isStore, net.fetcher);
    expect(r.storeUrl?.toString()).toBe("https://www.amazon.com.br/dp/B0CXYZ1234");
    expect(net.calls).toEqual([]);
  });
  it("encurtador da Amazon", async () => {
    const net = fakeNet({ "https://amzn.to/abc": { to: "https://www.amazon.com.br/dp/B0CXYZ1234?tag=outro-20" }, "https://www.amazon.com.br/dp/B0CXYZ1234?tag=outro-20": { html: "<title>TV</title>" } });
    const r = await resolveStoreLink(["https://amzn.to/abc"], isStore, net.fetcher);
    expect(r.storeUrl?.toString()).toBe("https://www.amazon.com.br/dp/B0CXYZ1234");
    expect(r.page?.html).toContain("TV");
  });
  it("site intermediário com botão para a loja; o link do Prime depois não atrapalha", async () => {
    const net = fakeNet({
      "https://promos.exemplo/ofertas/tv": { html: `<a class="btn" href="https://amzn.to/xyz">Ir para a loja</a>` },
      "https://amzn.to/xyz": { to: "https://www.amazon.com.br/dp/B0CXYZ1234?tag=promos-20" },
      "https://www.amazon.com.br/dp/B0CXYZ1234?tag=promos-20": { html: "<title>TV</title>" },
    });
    const r = await resolveStoreLink(["https://promos.exemplo/ofertas/tv", "https://is.gd/prime"], isStore, net.fetcher);
    expect(r.storeUrl?.toString()).toBe("https://www.amazon.com.br/dp/B0CXYZ1234");
    expect(r.link).toBe("https://promos.exemplo/ofertas/tv");
  });
  it("site intermediário fora do ar e o outro link é o cadastro do Prime: não inventa produto", async () => {
    const net = fakeNet({
      "https://promos.exemplo/ofertas/tv": { status: 503, html: "fora do ar" },
      "https://is.gd/prime": { to: "https://www.amazon.com.br/amazonprime?tag=promos-20" },
      "https://www.amazon.com.br/amazonprime?tag=promos-20": { html: `<a href="https://www.amazon.com.br/dp/B0OUTRO123">recomendado</a>` },
    });
    const r = await resolveStoreLink(["https://promos.exemplo/ofertas/tv", "https://is.gd/prime"], isStore, net.fetcher);
    expect(r.storeUrl).toBeNull();
    expect(r.storeHost).toBe("amazon.com.br");
  });
  it("link de afiliado do Mercado Livre (meli.la) cai na vitrine e acha o produto em destaque", async () => {
    const social = "https://www.mercadolivre.com.br/social/promotop?matt_word=x&ref=abc";
    const net = fakeNet({
      "https://meli.la/2PdrJby": { to: social },
      [social]: { html: `<meta property="og:title" content="Furadeira Wap"/><a href="https://www.mercadolivre.com.br/furadeira/p/MLB46208531?matt_tool=1#c_id=/home/card-featured/element">x</a>` },
    });
    const r = await resolveStoreLink(["https://meli.la/2PdrJby"], isStore, net.fetcher);
    expect(r.storeUrl?.toString()).toBe("https://www.mercadolivre.com.br/furadeira/p/MLB46208531");
    expect(r.page?.html).toContain("og:title");
  });
  it("sem link: explica o motivo", async () => {
    const r = await resolveStoreLink([], isStore, fakeNet({}).fetcher);
    expect(r.storeUrl).toBeNull();
    expect(r.reason).toMatch(/não tem link/);
  });
});

describe("formatos de produto vistos no canal Promoções Do Dia (21/10/2026)", () => {
  it("Mercado Livre: produto de vendedor em /up/MLBU... é produto e perde os parâmetros", () => {
    expect(isProductUrl(U("https://www.mercadolivre.com.br/jogo-de-panelas-brinox/up/MLBU5406933380?pdp_filters=item_id%3AMLB7753299392"))).toBe(true);
    expect(clean("https://www.mercadolivre.com.br/jogo-de-panelas-brinox/up/MLBU5406933380?pdp_filters=item_id%3AMLB7753299392&matt_tool=1#polycard_client=x"))
      .toBe("https://www.mercadolivre.com.br/jogo-de-panelas-brinox/up/MLBU5406933380");
  });
  it("vitrine do Mercado Livre com o destaque em /up/", () => {
    const html = `<a href="https://www.mercadolivre.com.br/outro/p/MLB79735337#reco_client=home_affiliate_profile_v2p">r</a>
      <a href="https://www.mercadolivre.com.br/jogo-de-panelas/up/MLBU5406933380?pdp_filters=item_id%3AMLB7753299392#polycard_client=x&amp;c_id=/home/card-featured/element">f</a>`;
    expect(mercadoLivreFeatured(html, U("https://www.mercadolivre.com.br/social/promocoesdodia"))?.pathname).toBe("/jogo-de-panelas/up/MLBU5406933380");
  });
  it("Shopee: /loja/número-da-loja/número-do-produto é produto; cupons e página da loja não", () => {
    expect(isProductUrl(U("https://shopee.com.br/opaanlp/1284002787/23793978215?__mobile__=1&mmp_pid=an_1"))).toBe(true);
    expect(clean("https://shopee.com.br/opaanlp/1284002787/23793978215?__mobile__=1&mmp_pid=an_1&utm_source=an_1")).toBe("https://shopee.com.br/opaanlp/1284002787/23793978215");
    expect(isProductUrl(U("https://shopee.com.br/m/cupom-de-desconto?mmp_pid=an_1"))).toBe(false);
    expect(isProductUrl(U("https://shopee.com.br/opaanlp"))).toBe(false);
    expect(isProductUrl(U("https://shopee.com.br/opaanlp/1284002787"))).toBe(false);
  });
});

describe("lista montada pelo divulgador no Mercado Livre (/social/fulano/lists/...)", () => {
  const LIST = U("https://www.mercadolivre.com.br/social/promocoesdodia/lists/d813c528-7740-4dd4-b1d4-019c6c695331?matt_tool=1");
  const card = (path: string) => `<a href="https://www.mercadolivre.com.br/${path}?pdp_filters=item_id%3AMLB5095130581&amp;matt_d2id=x#polycard_client=social-profile-middleend">c</a>`;
  it("com um produto só, é ele", () => {
    const html = `<a href="https://www.mercadolivre.com.br/ajuda">ajuda</a>${card("tv-lg-55/p/MLB76779701")}${card("tv-lg-55/p/MLB76779701")}`;
    expect(mercadoLivreFeatured(html, LIST)?.pathname).toBe("/tv-lg-55/p/MLB76779701");
  });
  it("com vários produtos, não chuta", () => {
    expect(mercadoLivreFeatured(`${card("tv-lg-55/p/MLB76779701")}${card("tv-lg-65/p/MLB76779702")}`, LIST)).toBeNull();
  });
  it("vitrine comum sem destaque continua sem produto (os cards são recomendações)", () => {
    expect(mercadoLivreFeatured(card("tv-lg-55/p/MLB76779701"), U("https://www.mercadolivre.com.br/social/promocoesdodia?ref=x"))).toBeNull();
  });
});

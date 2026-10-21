// Do link da publicação até a página do produto na loja, sem o afiliado de quem publicou.
// Segue encurtadores, links de redes de afiliados e páginas intermediárias (sites de ofertas que mostram um botão "ir para a loja").
// A rede entra por um "fetcher" injetado: em produção, o GET seguro do servidor; nos testes, respostas de mentira.
import { cleanStoreUrl, extractLinks, hostOf, isMercadoLivreSocial, isProductUrl, mercadoLivreFeatured, redirectTarget } from "./clean-url";

export type Fetched = { status: number; url: URL; html: string | null };
export type Fetcher = (url: URL) => Promise<Fetched>;

export type Resolved = {
  link: string | null; // o link da publicação que levou ao produto
  storeUrl: URL | null; // página do produto, limpa
  storeHost: string | null; // loja reconhecida, mesmo sem produto (útil para cupom da loja inteira)
  page: { html: string; url: URL } | null; // HTML já baixado do produto, quando houve
  reason: string | null; // por que não achou, para mostrar no painel
};

const MAX_LINKS = 3;
const MAX_FETCHES = 5;

export async function resolveStoreLink(links: string[], isStoreHost: (host: string) => boolean, fetcher: Fetcher): Promise<Resolved> {
  let fetches = 0;
  let storeHost: string | null = null;
  let reason = links.length === 0 ? "A publicação não tem link." : "Nenhum link levou a um produto de loja.";

  for (const raw of links.slice(0, MAX_LINKS)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    for (let hop = 0; hop < 4; hop++) {
      const target = redirectTarget(url);
      if (target) {
        url = target;
        continue;
      }
      const host = hostOf(url);
      const store = isStoreHost(host);
      if (store) storeHost ??= host;
      if (store && isProductUrl(url)) return { link: raw, storeUrl: cleanStoreUrl(url), storeHost: hostOf(cleanStoreUrl(url)), page: null, reason: null };
      if (fetches >= MAX_FETCHES) return { link: null, storeUrl: null, storeHost, page: null, reason: "Links demais para seguir nesta publicação." };

      fetches++;
      let got: Fetched;
      try {
        got = await fetcher(url);
      } catch {
        reason = `Não foi possível abrir ${host}.`;
        break;
      }
      const finalHost = hostOf(got.url);
      const finalStore = isStoreHost(finalHost);
      if (finalStore) storeHost = finalHost;
      if (finalStore && isProductUrl(got.url)) {
        const page = got.html && got.status >= 200 && got.status < 300 ? { html: got.html, url: got.url } : null;
        return { link: raw, storeUrl: cleanStoreUrl(got.url), storeHost: finalHost, page, reason: null };
      }
      if (isMercadoLivreSocial(got.url) && got.html) {
        const featured = mercadoLivreFeatured(got.html, got.url);
        // A vitrine traz título e foto do produto em destaque: serve como a página do produto.
        if (featured) return { link: raw, storeUrl: cleanStoreUrl(featured), storeHost: finalHost, page: { html: got.html, url: got.url }, reason: null };
        reason = "O link leva a uma lista de produtos do Mercado Livre, não a um produto.";
        break;
      }
      if (got.status >= 400) {
        reason = `${finalHost} respondeu ${got.status}.`;
        break;
      }
      // Só procura links dentro de páginas que não são da loja (site intermediário); numa página da loja,
      // os links são recomendações e levariam ao produto errado.
      if (finalStore || !got.html) {
        reason = finalStore ? "O link leva à loja, mas não a um produto." : reason;
        break;
      }
      const inside = extractLinks(got.html, got.url).filter((u) => isStoreHost(hostOf(u)) || redirectTarget(u));
      const product = inside.find((u) => isStoreHost(hostOf(u)) && isProductUrl(u));
      if (product) return { link: raw, storeUrl: cleanStoreUrl(product), storeHost: hostOf(product), page: null, reason: null };
      const next = inside[0];
      if (!next) {
        reason = `A página ${finalHost} não tem link para uma loja conhecida.`;
        break;
      }
      url = next; // encurtador ou rede de afiliado dentro da página intermediária
    }
  }
  return { link: null, storeUrl: null, storeHost, page: null, reason };
}

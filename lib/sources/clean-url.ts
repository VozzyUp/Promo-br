// Links de loja: reconhecer o produto, tirar o código de afiliado de quem publicou e achar o destino escondido.
// Funções puras (sem rede), testadas em tests/sources-clean-url.test.ts.
import { decodeEntities } from "./parse-web";

/** Lojas grandes reconhecidas mesmo sem estarem cadastradas (a loja é criada na hora, esperando revisão). */
export const KNOWN_STORE_HOSTS = [
  "amazon.com.br", "mercadolivre.com.br", "shopee.com.br", "magazineluiza.com.br", "magazinevoce.com.br", "kabum.com.br",
  "casasbahia.com.br", "pontofrio.com.br", "extra.com.br", "aliexpress.com", "americanas.com.br", "submarino.com.br",
  "shoptime.com.br", "carrefour.com.br", "fastshop.com.br", "terabyteshop.com.br", "pichau.com.br", "netshoes.com.br",
  "centauro.com.br", "nike.com.br", "adidas.com.br", "shein.com", "girafa.com.br", "leroymerlin.com.br", "madeiramadeira.com.br",
  "drogasil.com.br", "drogaraia.com.br", "samsung.com", "dell.com", "lenovo.com", "zattini.com.br", "dafiti.com.br",
];

export const hostOf = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "");
const under = (host: string, base: string) => host === base || host.endsWith(`.${base}`);

export function isKnownStoreHost(host: string): boolean {
  return KNOWN_STORE_HOSTS.some((b) => under(host, b));
}

/** Encurtadores e links de divulgação: nunca são a página do produto, sempre precisam ser seguidos. */
const SHORTENERS = [
  "amzn.to", "a.co", "meli.la", "mercadolivre.com", "mercadolibre.com", "s.shopee.com.br", "shope.ee", "s.click.aliexpress.com",
  "bit.ly", "is.gd", "tinyurl.com", "cutt.ly", "tidd.ly", "rebrand.ly", "t.co", "ow.ly", "encurtador.com.br", "divulgador.magalu.com",
];

const ASIN = /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin)\/([A-Z0-9]{10})(?:[/?#]|$)/i;

/** O endereço parece a página de um produto (e não a home, uma lista, um cadastro ou um perfil de afiliado)? */
export function isProductUrl(u: URL): boolean {
  const host = hostOf(u);
  const path = u.pathname;
  if (/(^|\.)amazon\./.test(host)) return ASIN.test(path);
  if (/mercadoli[bv]re\.com/.test(host)) return !/\/social\//i.test(path) && /MLB-?\d{6,}/i.test(path);
  if (under(host, "shopee.com.br")) return /-i\.\d+\.\d+/.test(path) || /^\/product\/\d+\/\d+/.test(path);
  if (under(host, "magazineluiza.com.br") || under(host, "magazinevoce.com.br")) return /\/p\/[a-z0-9]{6,}/i.test(path);
  if (under(host, "kabum.com.br")) return /^\/produto\/\d+/.test(path);
  if (/aliexpress\./.test(host)) return /\/item\/\d+\.html/.test(path);
  if (/(americanas|submarino|shoptime)\.com\.br$/.test(host)) return /\/produto\/\d+/.test(path);
  if (/(casasbahia|pontofrio|extra)\.com\.br$/.test(host)) return /\/p\/\d+/.test(path) || /-\d{6,}\.html$/.test(path);
  if (SHORTENERS.some((s) => under(host, s))) return false;
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0 || (segments.length === 1 && segments[0].length < 16)) return false; // "/2PdrJby" é código de encurtador
  if (/\/(login|entrar|signup|cadastro|assinatura|assine|prime|app|download|voucher|cupons?|lists?|listas?|social|busca|search|categoria|c)(\/|$)/i.test(path)) return false;
  return /\d/.test(path) || path.split("/").some((seg) => seg.length > 20);
}

const TRACKING = /^(utm_\w+|aff\w*|affiliate\w*|partner\w*|ref|ref_|tag|linkcode|linkid|ascsubtag|creative\w*|camp|matt_\w+|mmp_\w+|uls_\w+|gclid|gbraid|wbraid|fbclid|srsltid|awc|clickid|irclickid|sub_?id\d*|source|origem|campaign|cm_mmc|s_cid|zanpid|admitad\w*|lmd\w*|lomadee\w*|mc_\w+|_branch\w*|dclid|msclkid|yclid|twclid|igshid|si|spm|scm|pvid|algo_\w+|forceinapp|pdp_filters|tracking_id|reco_\w+|c_id|c_uid|wid|sid|smid|psc|th|social_\w*|share\w*|deal_\w+)$/i;

/** Mesmo produto, sem código de afiliado nem rastreadores de quem divulgou. */
export function cleanStoreUrl(input: URL): URL {
  const u = new URL(input.toString());
  u.hash = "";
  const host = hostOf(u);
  if (/(^|\.)amazon\./.test(host)) {
    const asin = ASIN.exec(u.pathname);
    if (asin) return new URL(`https://${u.hostname}/dp/${asin[1].toUpperCase()}`);
  }
  // Vitrine do Parceiro Magalu (magazinevoce.com.br/magazinefulano/...) aponta para o mesmo produto da Magalu.
  if (under(host, "magazinevoce.com.br")) {
    const parts = u.pathname.split("/").filter(Boolean);
    return new URL(`https://www.magazineluiza.com.br/${parts.slice(1).join("/")}${u.pathname.endsWith("/") ? "/" : ""}`);
  }
  if (isKnownStoreHost(host)) {
    u.search = ""; // nas lojas grandes o endereço do produto não depende de parâmetro nenhum
    return u;
  }
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  return u;
}

const REDIRECT_PARAMS = ["ued", "url", "u", "to", "dest", "destination", "redirect", "redirect_url", "redirecturl", "r", "link", "target", "murl", "goto"];

/** Links de redes de afiliados que levam o destino num parâmetro (ex.: awin1.com/cread.php?...&ued=https%3A%2F%2F...). */
export function redirectTarget(u: URL): URL | null {
  for (const k of REDIRECT_PARAMS) {
    const v = u.searchParams.get(k);
    if (!v || !/^https?:\/\//i.test(v)) continue;
    try {
      return new URL(v);
    } catch {
      // valor quebrado: tenta o próximo
    }
  }
  return null;
}

/** Endereços que uma página intermediária aponta: links, redirecionamento por meta ou script e endereços soltos. */
export function extractLinks(html: string, base: URL): URL[] {
  const found: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const v = decodeEntities(raw.replace(/\\\//g, "/")).trim(); // "https:\/\/..." dentro de JSON vira "https://..."
    if (!/^(https?:)?\/\//i.test(v) && !v.startsWith("/")) return;
    try {
      const u = new URL(v, base);
      if ((u.protocol === "https:" || u.protocol === "http:") && !found.includes(u.toString())) found.push(u.toString());
    } catch {
      // ignora endereço inválido
    }
  };
  for (const m of html.matchAll(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>\s]+)/gi)) push(m[1]);
  for (const m of html.matchAll(/(?:location(?:\.href)?\s*=|location\.(?:replace|assign)\()\s*["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')/gi)) push(m[1] ?? m[2]);
  for (const m of html.matchAll(/https?:\\?\/\\?\/[^\s"'<>\\)]+/gi)) push(m[0]);
  return found.map((s) => new URL(s));
}

/**
 * Link de afiliado do Mercado Livre (meli.la) abre a vitrine de quem divulgou (/social/fulano?ref=...).
 * O produto divulgado é o card em destaque; os outros cards são recomendações.
 */
export function mercadoLivreFeatured(html: string, base: URL): URL | null {
  const links = extractLinks(html, base).filter((u) => /mercadoli[bv]re\.com/.test(hostOf(u)) && isProductUrl(u));
  return links.find((u) => /card-featured/.test(u.toString())) ?? null;
}

export function isMercadoLivreSocial(u: URL): boolean {
  return /mercadoli[bv]re\.com/.test(hostOf(u)) && /^\/social\//i.test(u.pathname);
}

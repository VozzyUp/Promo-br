// Chave de duplicata: o mesmo produto na mesma loja gera a mesma chave, mesmo com tag de afiliado,
// rastreadores (utm_*, ref, tag) ou nome diferente no meio do endereço. O link do autor nunca é alterado:
// a chave só serve para comparar.

const ID_PARAMS = new Set(["id", "itemid", "item_id", "sku", "pid", "product", "produto", "p", "idproduto", "codigo"]);

export function urlKey(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "").toLowerCase() || "/";

  // Amazon: o ASIN identifica o produto, o resto do caminho é só o título.
  if (/(^|\.)amazon\./.test(host)) {
    const asin = /\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:[/?]|$)/i.exec(url.pathname);
    if (asin) return `${host}/dp/${asin[1].toLowerCase()}`;
  }
  // Mercado Livre: o código MLB identifica o anúncio.
  if (/(^|\.)mercadolivre\.com|(^|\.)mercadolibre\.com/.test(host)) {
    const mlb = /mlb-?(\d{6,})/i.exec(url.pathname + url.search);
    // produto., www., lista. etc. são o mesmo site: compara só o domínio base
    const base = /(mercadoli[bv]re\.com(?:\.[a-z]{2})?)$/.exec(host)?.[1] ?? host;
    if (mlb) return `${base}/mlb${mlb[1]}`;
  }

  const ids = [...url.searchParams.entries()]
    .filter(([k]) => ID_PARAMS.has(k.toLowerCase()))
    .map(([k, v]) => `${k.toLowerCase()}=${v.toLowerCase()}`)
    .sort();
  return ids.length ? `${host}${path}?${ids.join("&")}` : `${host}${path}`;
}

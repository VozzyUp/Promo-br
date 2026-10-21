// Leitor de HTML do preview de link. Função pura (sem rede), por isso é fácil de testar.
// Entende og:*, twitter:*, meta de produto e JSON-LD (schema.org/Product).

export type Preview = { title: string | null; imageUrl: string | null; priceCents: number | null; currency: string | null; gtin?: string };

import { normalizeGtin } from "./ean";

const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };

function decode(s: string): string {
  return s
    .replace(/&(amp|quot|apos|lt|gt|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/\s+/g, " ")
    .trim();
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

/** "199,90", "1.299,90", "1299.9" e "R$ 199" viram centavos. Devolve null se não parecer preço. */
export function priceToCents(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) : null;
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    s = decimal === "," ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = /,\d{1,2}$/.test(s) && s.indexOf(",") === lastComma ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot >= 0) {
    s = /\.\d{1,2}$/.test(s) && s.indexOf(".") === lastDot ? s : s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 100_000_000 ? Math.round(n * 100) : null;
}

function absoluteHttp(raw: string | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

type Json = unknown;

function* walk(node: Json, depth = 0): Generator<Record<string, unknown>> {
  if (depth > 6 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  yield obj;
  for (const v of Object.values(obj)) yield* walk(v, depth + 1);
}

function isProduct(o: Record<string, unknown>): boolean {
  const t = o["@type"];
  return Array.isArray(t) ? t.includes("Product") : t === "Product";
}

function fromJsonLd(html: string) {
  const out: { title?: string; image?: string; price?: number; currency?: string; gtin?: string } = {};
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: Json;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    for (const o of walk(data)) {
      if (!isProduct(o)) continue;
      if (!out.title && typeof o.name === "string") out.title = o.name;
      for (const k of ["gtin", "gtin13", "gtin14", "gtin12", "gtin8"]) {
        const g = normalizeGtin(o[k]);
        if (!out.gtin && g) out.gtin = g;
      }
      const img = Array.isArray(o.image) ? o.image[0] : o.image;
      if (!out.image && typeof img === "string") out.image = img;
      const offers = Array.isArray(o.offers) ? o.offers : o.offers ? [o.offers] : [];
      for (const of of offers as Record<string, unknown>[]) {
        const cents = priceToCents(of.price ?? of.lowPrice);
        if (cents != null && out.price == null) {
          out.price = cents;
          if (typeof of.priceCurrency === "string") out.currency = of.priceCurrency;
        }
      }
    }
  }
  return out;
}

export function parsePreview(html: string, baseUrl: string): Preview {
  const meta = new Map<string, string>();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    const key = (a.property ?? a.name ?? a.itemprop ?? "").toLowerCase();
    if (key && a.content !== undefined && !meta.has(key)) meta.set(key, a.content);
  }
  const ld = fromJsonLd(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  const title = decode(meta.get("og:title") ?? meta.get("twitter:title") ?? ld.title ?? titleTag ?? "") || null;
  const imageUrl = absoluteHttp(meta.get("og:image:secure_url") ?? meta.get("og:image") ?? meta.get("twitter:image") ?? ld.image, baseUrl);

  const metaPrice = priceToCents(meta.get("product:price:amount") ?? meta.get("og:price:amount") ?? meta.get("price"));
  const priceCents = metaPrice ?? ld.price ?? null;
  const currency = (meta.get("product:price:currency") ?? meta.get("og:price:currency") ?? meta.get("pricecurrency") ?? ld.currency ?? null)?.toUpperCase() ?? null;

  // Só preço em reais serve; outra moeda é descartada em vez de virar um preço errado.
  const usable = currency === null || currency === "BRL";
  const gtin = normalizeGtin(meta.get("product:ean") ?? meta.get("og:upc") ?? meta.get("gtin13") ?? meta.get("gtin")) ?? ld.gtin;
  return {
    title: title ? title.slice(0, 140) : null,
    imageUrl,
    priceCents: usable ? priceCents : null,
    currency,
    ...(gtin ? { gtin } : {}),
  };
}

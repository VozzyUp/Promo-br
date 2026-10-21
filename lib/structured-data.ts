// Dados estruturados (schema.org) da oferta, para o Google mostrar preço e disponibilidade.
import type { DealView } from "./types";

export function dealJsonLd(deal: DealView, siteUrl: string, now = new Date()): Record<string, unknown> | null {
  if (deal.priceCents == null || deal.status === "pending" || deal.status === "rejected" || deal.status === "removed") return null;
  const expired = deal.status === "expired" || (!!deal.expiresAt && new Date(deal.expiresAt).getTime() < now.getTime());
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    ...(deal.imageUrl ? { image: [deal.imageUrl] } : {}),
    ...(deal.description ? { description: deal.description.replace(/\s+/g, " ").slice(0, 300) } : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl.replace(/\/$/, "")}/oferta/${deal.slug}`,
      priceCurrency: "BRL",
      price: (deal.priceCents / 100).toFixed(2),
      availability: expired ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      ...(deal.expiresAt ? { priceValidUntil: deal.expiresAt.slice(0, 10) } : {}),
      seller: { "@type": "Organization", name: deal.store.name },
    },
  };
}

/** JSON seguro para ir dentro de uma tag script: nada de "<" que feche a tag. */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, " ");
}
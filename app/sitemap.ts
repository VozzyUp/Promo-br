import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/data/browse";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const e = await sitemapEntries();
  const fixed = ["", "/cupons", "/gratis", "/black-friday", "/discussoes", "/sobre", "/como-ganhamos-dinheiro", "/privacidade", "/termos", "/conduta"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}` })),
    ...e.categories.map((c) => ({ url: `${base}/c/${c.slug}` })),
    ...e.stores.map((s) => ({ url: `${base}/loja/${s.slug}` })),
    ...e.deals.map((d) => ({ url: `${base}/oferta/${d.slug}`, lastModified: d.updated_at })),
    ...e.discussions.map((d) => ({ url: `${base}/discussoes/${d.slug}`, lastModified: d.last_activity_at })),
  ];
}

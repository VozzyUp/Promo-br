import { AdUnit } from "@/components/consent/ad-unit";
import Link from "next/link";
import { ArrowRight, Flag } from "lucide-react";
import { DealImage, DiscountChip } from "@/components/deal-parts";
import { formatPrice } from "@/lib/format";
import type { DealView } from "@/lib/types";

export function HotSidebar({ deals }: { deals: DealView[] }) {
  if (deals.length === 0) return null;
  return (
    <section aria-labelledby="hot-title" className="rounded-card bg-bg p-4 shadow-card">
      <h2 id="hot-title" className="mb-3 text-title font-bold">Mais quentes agora</h2>
      <ul className="flex flex-col gap-4">
        {deals.map((d) => (
          <li key={d.id}>
            <Link href={`/oferta/${d.slug}`} className="flex gap-3 hover:text-accent">
              <div className="relative shrink-0">
                <DealImage deal={d} size="mini" />
                <span className="absolute left-1 top-1 rounded-xs bg-bg px-1 text-sm font-bold text-hot">{d.temperature}°</span>
              </div>
              <div className="flex min-w-0 flex-col items-start gap-1">
                <span className="line-clamp-3 text-sm">{d.title}</span>
                {d.priceCents != null ? <span className="text-base font-bold text-price">{formatPrice(d.priceCents)}</span> : null}
                {d.realDiscountBp ? <DiscountChip pct={Math.round(d.realDiscountBp / 100)} /> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/?aba=quentes" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent">
        Ver mais <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

/** Espaço de anúncio com altura reservada (sem CLS). O AdSense só carrega depois do aceite de cookies. */
export function AdSlot({ minHeight = 100, className = "", format = "horizontal" }: { minHeight?: number; className?: string; format?: "auto" | "vertical" | "horizontal" }) {
  return (
    <aside aria-label="Publicidade" className={`rounded-card bg-bg p-3 shadow-card ${className}`}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Publicidade</span>
        <button type="button" className="flex items-center gap-1 hover:text-text">Denunciar <Flag className="size-3" aria-hidden /></button>
      </div>
      <div className={`rounded-sm bg-surface${format === "horizontal" ? " ad-unit-horizontal-frame" : ""}`} style={format === "horizontal" ? undefined : { minHeight }}>
        <AdUnit minHeight={minHeight} format={format} />
      </div>
    </aside>
  );
}

export function CategoriesWidget({ categories }: { categories: { id: string; name: string; slug: string; count: number }[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="cat-title" className="rounded-card bg-bg p-4 shadow-card">
      <h2 id="cat-title" className="mb-3 text-title font-bold">Categorias populares</h2>
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/c/${c.slug}`} className="inline-block rounded-pill border border-border px-3 py-1.5 text-sm hover:bg-surface">
              {c.name} <span className="text-muted">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CouponsWidget({ deals }: { deals: DealView[] }) {
  if (deals.length === 0) return null;
  return (
    <section aria-labelledby="coup-title" className="rounded-card bg-bg p-4 shadow-card">
      <h2 id="coup-title" className="mb-3 text-title font-bold">Melhores cupons</h2>
      <ul className="flex flex-col gap-3">
        {deals.map((d) => (
          <li key={d.id}>
            <Link href={`/oferta/${d.slug}`} className="flex flex-col gap-0.5 hover:text-accent">
              <span className="line-clamp-2 text-sm">{d.title}</span>
              <span className="text-sm text-muted">{d.store.name} · <code className="font-bold text-text">{d.couponCode}</code></span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/cupons" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent">
        Ver todos <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-bg px-6 py-12 text-center shadow-card">
      <p className="text-title font-bold">{title}</p>
      {children}
    </div>
  );
}

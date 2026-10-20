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

/** Espaço de anúncio com altura reservada (sem CLS). O AdSense entra aqui depois do consentimento. */
export function AdSlot({ minHeight = 250, className = "" }: { minHeight?: number; className?: string }) {
  return (
    <aside aria-label="Publicidade" className={`rounded-card bg-bg p-3 shadow-card ${className}`}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Publicidade</span>
        <button type="button" className="flex items-center gap-1 hover:text-text">Denunciar <Flag className="size-3" aria-hidden /></button>
      </div>
      <div className="rounded-sm bg-surface" style={{ minHeight }} />
    </aside>
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

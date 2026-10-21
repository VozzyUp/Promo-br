import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { DealView } from "@/lib/types";

/** Mesmo produto em outras lojas (ligado pelo código de barras), do mais barato ao mais caro. */
export function SameProductDeals({ current, others }: { current: DealView; others: DealView[] }) {
  if (others.length === 0 || current.priceCents == null) return null;
  const rows = [current, ...others].filter((d) => d.priceCents != null).sort((a, b) => a.priceCents! - b.priceCents!);
  const cheapest = rows[0].priceCents!;
  return (
    <section aria-labelledby="same-title" className="-mx-4 flex flex-col gap-3 border-y border-border bg-bg p-4 sm:mx-0 sm:rounded-card sm:border-0 sm:shadow-card md:p-6">
      <h2 id="same-title" className="text-title font-bold">Este produto em outras lojas</h2>
      <ul className="divide-y divide-border">
        {rows.map((d) => {
          const isCurrent = d.id === current.id;
          const diff = d.priceCents! - cheapest;
          return (
            <li key={d.id} className={`flex items-center justify-between gap-3 py-3 ${isCurrent ? "font-bold" : ""}`}>
              <span className="min-w-0">
                {isCurrent ? (
                  <span>{d.store.name} <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs text-accent">Esta oferta</span></span>
                ) : (
                  <Link href={`/oferta/${d.slug}`} className="hover:text-accent">{d.store.name}</Link>
                )}
                <span className="block text-sm font-normal text-muted">{diff === 0 ? "Menor preço" : `${formatPrice(diff)} a mais que o menor`}</span>
              </span>
              <span className="text-price font-bold text-price">{formatPrice(d.priceCents!)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
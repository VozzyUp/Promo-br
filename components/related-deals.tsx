import Link from "next/link";
import { DealImage, PriceBlock } from "@/components/deal-parts";
import type { DealView } from "@/lib/types";

/** "Ofertas parecidas": quatro atalhos para continuar navegando depois de ler a oferta. */
export function RelatedDeals({ deals }: { deals: DealView[] }) {
  if (deals.length === 0) return null;
  return (
    <section aria-labelledby="rel-title" className="-mx-4 flex flex-col gap-3 border-y border-border bg-bg p-4 sm:mx-0 sm:rounded-card sm:border-0 sm:shadow-card md:p-6">
      <h2 id="rel-title" className="text-title font-bold">Ofertas parecidas</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {deals.map((d) => (
          <li key={d.id}>
            <Link href={`/oferta/${d.slug}`} className="flex gap-3 rounded-sm p-1 hover:bg-surface">
              <div className="shrink-0"><DealImage deal={d} size="mini" /></div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="line-clamp-2 font-bold">{d.title}</span>
                <PriceBlock deal={d} />
                <span className="text-sm text-muted">{d.store.name}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
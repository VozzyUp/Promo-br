import Link from "next/link";
import { DealCard } from "@/components/deal-card";
import { AdSlot, EmptyState, HotSidebar } from "@/components/sidebar";
import { ButtonLink } from "@/components/ui/button";
import { listFeed, listHot } from "@/lib/data";
import { getSession } from "@/lib/auth";
import type { FeedTab } from "@/lib/types";

const tabs: { id: FeedTab; label: string }[] = [
  { id: "quentes", label: "Mais quentes" },
  { id: "descontos", label: "Maiores descontos" },
  { id: "novas", label: "Novas" },
];

const AD_EVERY = 4;

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const tab = (tabs.find((t) => t.id === sp.aba)?.id ?? "quentes") as FeedTab;
  const session = await getSession();
  const [{ items }, hot] = await Promise.all([
    listFeed({ tab, viewerId: session?.userId ?? null }),
    listHot(4, session?.userId ?? null),
  ]);

  return (
    <div className="mx-auto max-w-(--layout-max) px-4">
      <section className="pb-2 pt-6 md:pt-10">
        <h1 className="text-xl font-bold md:text-display">Promoção de verdade, aprovada por quem compra</h1>
        <p className="mt-2 text-base text-muted md:text-title md:font-normal">
          Ofertas e cupons publicados pela comunidade, com o desconto real conferido.
        </p>
      </section>

      <nav aria-label="Ordenar ofertas" className="sticky top-[calc(var(--header-top)+var(--header-nav))] z-30 -mx-4 mb-4 flex gap-6 overflow-x-auto border-b border-border bg-bg px-4 md:static md:mx-0 md:rounded-card">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "quentes" ? "/" : `/?aba=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`shrink-0 border-b-2 py-3 text-sm font-bold ${t.id === tab ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-(--layout-main)">
          <AdSlot minHeight={120} />
          {items.length === 0 ? (
            <EmptyState title={tab === "descontos" ? "Nenhuma oferta verificada ainda" : "Nada por aqui ainda"}>
              <p className="text-sm text-muted">Achou uma promoção boa? Seja a primeira pessoa a publicar.</p>
              <ButtonLink href="/publicar">Publicar oferta</ButtonLink>
            </EmptyState>
          ) : (
            items.map((deal, i) => (
              <div key={deal.id} className="contents">
                <DealCard deal={deal} loggedIn={!!session} />
                {(i + 1) % AD_EVERY === 0 ? <AdSlot /> : null}
              </div>
            ))
          )}
        </div>
        <div className="flex w-full flex-col gap-4 lg:sticky lg:top-[calc(var(--header-top)+var(--header-nav)+16px)] lg:w-(--layout-aside) lg:shrink-0">
          <HotSidebar deals={hot} />
          <AdSlot minHeight={600} className="hidden lg:block" />
        </div>
      </div>
    </div>
  );
}

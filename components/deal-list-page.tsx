import Link from "next/link";
import type { ReactNode } from "react";
import { DealCard } from "@/components/deal-card";
import { AdSlot, EmptyState } from "@/components/sidebar";
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { listDeals, type BrowseOpts, type BrowseTab } from "@/lib/data/browse";
import { savedSet } from "@/lib/data/relations";

const TABS: { id: BrowseTab; label: string }[] = [
  { id: "quentes", label: "Mais quentes" },
  { id: "descontos", label: "Maiores descontos" },
  { id: "novas", label: "Novas" },
];
const AD_EVERY = 4;

export function parseTab(v: unknown): BrowseTab {
  return TABS.some((t) => t.id === v) ? (v as BrowseTab) : "quentes";
}
export function parsePage(v: unknown): number {
  const n = Number(typeof v === "string" ? v : 1);
  return Number.isInteger(n) && n >= 1 && n <= 200 ? n : 1;
}

/** Página de listagem de ofertas: título, abas de ordem, cartões, anúncios e paginação por link. */
export async function DealListPage({
  title, description, basePath, extraQuery = {}, filters, tab, page, empty, header,
}: {
  title: string;
  description?: string;
  basePath: string;
  extraQuery?: Record<string, string>;
  filters: Omit<BrowseOpts, "viewerId" | "tab" | "page">;
  tab: BrowseTab;
  page: number;
  empty?: ReactNode;
  header?: ReactNode;
}) {
  const session = await getSession();
  const { items, hasNext } = await listDeals({ ...filters, viewerId: session?.userId ?? null, tab, page });
  const saved = session ? await savedSet(session.userId, items.map((d) => d.id)) : new Set<string>();
  const href = (t: BrowseTab, p = 1) => {
    const q = new URLSearchParams(extraQuery);
    if (t !== "quentes") q.set("aba", t);
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold md:text-display">{title}</h1>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </header>
      {header}
      <nav aria-label="Ordenar ofertas" className="flex gap-6 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <Link key={t.id} href={href(t.id)} aria-current={t.id === tab ? "page" : undefined}
            className={`shrink-0 border-b-2 py-3 text-sm font-bold ${t.id === tab ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="flex max-w-(--layout-main) flex-col gap-4">
        {items.length === 0 ? (
          empty ?? (
            <EmptyState title="Nada por aqui ainda">
              <p className="text-sm text-muted">Achou algo bom? Seja a primeira pessoa a publicar.</p>
              <ButtonLink href="/publicar">Publicar</ButtonLink>
            </EmptyState>
          )
        ) : (
          items.map((deal, i) => (
            <div key={deal.id} className="contents">
              <DealCard deal={deal} loggedIn={!!session} saved={saved.has(deal.id)} />
              {(i + 1) % AD_EVERY === 0 ? <AdSlot /> : null}
            </div>
          ))
        )}
        <nav aria-label="Páginas" className="flex justify-between">
          {page > 1 ? <Link href={href(tab, page - 1)} className="font-bold text-accent">Anteriores</Link> : <span />}
          {hasNext ? <Link href={href(tab, page + 1)} className="font-bold text-accent">Mais ofertas</Link> : <span />}
        </nav>
      </div>
    </div>
  );
}

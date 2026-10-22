import Link from "next/link";
import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";
import { FREE_KINDS, freeKind } from "@/lib/menus";

export async function generateMetadata({ searchParams }: PageProps<"/gratis">) {
  const kind = freeKind((await searchParams).tipo);
  return {
    title: kind?.label ?? "Grátis",
    description: kind ? `${kind.label}, achados pela comunidade.` : "Produtos, jogos e serviços de graça, achados pela comunidade.",
  };
}

export default async function FreePage({ searchParams }: PageProps<"/gratis">) {
  const sp = await searchParams;
  const kind = freeKind(sp.tipo);
  const chip = (active: boolean) =>
    `shrink-0 rounded-pill border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent text-on-accent" : "border-border hover:border-accent"}`;
  return (
    <DealListPage
      title={kind?.label ?? "Grátis"}
      description="Brindes, jogos e testes sem pagar nada. Confira as condições antes de aproveitar."
      basePath="/gratis"
      extraQuery={kind ? { tipo: kind.slug } : {}}
      filters={{ free: true, query: kind?.query }}
      tab={parseTab(sp.aba)}
      page={parsePage(sp.pagina)}
      header={
        <nav aria-label="Tipos de grátis" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          <Link href="/gratis" aria-current={kind ? undefined : "page"} className={chip(!kind)}>Tudo</Link>
          {FREE_KINDS.map((k) => (
            <Link key={k.slug} href={`/gratis?tipo=${k.slug}`} aria-current={kind?.slug === k.slug ? "page" : undefined} className={chip(kind?.slug === k.slug)}>
              {k.label}
            </Link>
          ))}
        </nav>
      }
    />
  );
}

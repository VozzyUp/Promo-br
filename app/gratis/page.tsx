import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";

export const metadata = { title: "Grátis", description: "Produtos, jogos e serviços de graça, achados pela comunidade." };

export default async function FreePage({ searchParams }: PageProps<"/gratis">) {
  const sp = await searchParams;
  return (
    <DealListPage
      title="Grátis"
      description="Brindes, jogos e testes sem pagar nada. Confira as condições antes de aproveitar."
      basePath="/gratis"
      filters={{ free: true }}
      tab={parseTab(sp.aba)}
      page={parsePage(sp.pagina)}
    />
  );
}

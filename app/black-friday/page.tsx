import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";

export const metadata = { title: "Black Friday", description: "As melhores ofertas da Black Friday, com o desconto real conferido pela comunidade." };

export default async function BlackFridayPage({ searchParams }: PageProps<"/black-friday">) {
  const sp = await searchParams;
  return (
    <DealListPage
      title="Black Friday"
      description="27 de novembro de 2026. Aqui o desconto é conferido: preço “de” inflado não entra."
      basePath="/black-friday"
      filters={{}}
      tab={parseTab(sp.aba ?? "quentes")}
      page={parsePage(sp.pagina)}
    />
  );
}

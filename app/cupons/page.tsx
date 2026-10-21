import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";

export const metadata = { title: "Cupons de desconto", description: "Códigos de desconto publicados e testados pela comunidade." };

export default async function CouponsPage({ searchParams }: PageProps<"/cupons">) {
  const sp = await searchParams;
  return (
    <DealListPage
      title="Cupons de desconto"
      description="Códigos publicados pela comunidade. Os vencidos saem da lista."
      basePath="/cupons"
      filters={{ coupons: true }}
      tab={parseTab(sp.aba)}
      page={parsePage(sp.pagina)}
    />
  );
}

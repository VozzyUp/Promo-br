import { notFound } from "next/navigation";
import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";
import { getStoreBySlug } from "@/lib/data/browse";

export async function generateMetadata({ params }: PageProps<"/loja/[slug]">) {
  const s = await getStoreBySlug((await params).slug);
  return { title: s ? `Ofertas e cupons ${s.name}` : "Loja não encontrada" };
}

export default async function StorePage({ params, searchParams }: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  return (
    <DealListPage
      title={store.name}
      description={`Ofertas e cupons da ${store.name} publicados pela comunidade.`}
      basePath={`/loja/${store.slug}`}
      filters={{ storeId: store.id }}
      tab={parseTab(sp.aba)}
      page={parsePage(sp.pagina)}
    />
  );
}

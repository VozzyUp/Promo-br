import { notFound } from "next/navigation";
import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";
import { getCategoryBySlug } from "@/lib/data/browse";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">) {
  const c = await getCategoryBySlug((await params).slug);
  return { title: c ? `Ofertas de ${c.name}` : "Categoria não encontrada" };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <DealListPage
      title={category.name}
      description={`Ofertas e cupons de ${category.name.toLowerCase()} publicados pela comunidade.`}
      basePath={`/c/${category.slug}`}
      filters={{ categoryId: category.id }}
      tab={parseTab(sp.aba)}
      page={parsePage(sp.pagina)}
    />
  );
}

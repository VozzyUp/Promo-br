import { EmptyState } from "@/components/sidebar";
import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";

export async function generateMetadata({ searchParams }: PageProps<"/busca">) {
  const q = (await searchParams).q;
  return { title: typeof q === "string" && q.trim() ? `Busca: ${q.trim().slice(0, 60)}` : "Busca", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: PageProps<"/busca">) {
  const sp = await searchParams;
  const query = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  if (!query) {
    return (
      <div className="mx-auto max-w-(--layout-max) px-4 py-8">
        <EmptyState title="Busque uma oferta">
          <p className="text-sm text-muted">Digite o nome do produto, da loja ou do cupom na caixa de busca do topo.</p>
        </EmptyState>
      </div>
    );
  }
  return (
    <DealListPage
      title={`Resultados para “${query}”`}
      basePath="/busca"
      extraQuery={{ q: query }}
      filters={{ query }}
      tab={parseTab(sp.aba)}
      page={parsePage(sp.pagina)}
      empty={
        <EmptyState title="Nenhum resultado">
          <p className="text-sm text-muted">Tente outra palavra, ou crie um alerta para ser avisado quando aparecer.</p>
        </EmptyState>
      }
    />
  );
}

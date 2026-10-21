import { DealListPage, parsePage, parseTab } from "@/components/deal-list-page";
import { daysUntil } from "@/lib/format";

export const metadata = { title: "Black Friday", description: "As melhores ofertas da Black Friday, com o desconto real conferido pela comunidade." };
export const dynamic = "force-dynamic";

// Black Friday 2026: sexta, 27 de novembro, a partir de 00:00 em Brasília.
const BLACK_FRIDAY = "2026-11-27T00:00:00-03:00";

function countdown(): string {
  const d = daysUntil(BLACK_FRIDAY);
  if (d > 1) return `Faltam ${d} dias para a Black Friday (27 de novembro de 2026).`;
  if (d === 1) return "A Black Friday começa amanhã, 27 de novembro.";
  if (d === 0 || d === -0) return "É hoje: Black Friday, 27 de novembro.";
  return "A Black Friday passou, mas as ofertas boas continuam aparecendo.";
}

export default async function BlackFridayPage({ searchParams }: PageProps<"/black-friday">) {
  const sp = await searchParams;
  return (
    <DealListPage
      title="Black Friday"
      description={`${countdown()} Aqui o desconto é conferido: preço “de” inflado não entra.`}
      basePath="/black-friday"
      filters={{}}
      tab={parseTab(sp.aba ?? "quentes")}
      page={parsePage(sp.pagina)}
    />
  );
}
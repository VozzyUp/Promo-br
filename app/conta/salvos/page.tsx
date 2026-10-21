import { DealCard } from "@/components/deal-card";
import { EmptyState } from "@/components/sidebar";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listSavedDeals } from "@/lib/data/relations";

export const metadata = { title: "Salvos" };

export default async function SavedPage() {
  const session = await requireUser("/conta/salvos");
  const deals = await listSavedDeals(session.userId);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Ofertas salvas</h1>
      {deals.length === 0 ? (
        <EmptyState title="Você ainda não salvou nada">
          <p className="text-sm text-muted">Toque no marcador de uma oferta para guardá-la aqui.</p>
          <ButtonLink href="/">Ver ofertas</ButtonLink>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} loggedIn saved />
          ))}
        </div>
      )}
    </div>
  );
}

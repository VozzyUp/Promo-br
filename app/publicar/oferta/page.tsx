import { PublishWizard } from "@/components/publish/wizard";
import { requireUser } from "@/lib/auth";
import { getProfile, listCategories } from "@/lib/data";

export const metadata = { title: "Publicar oferta" };

export default async function PublishDealPage() {
  const session = await requireUser("/publicar/oferta");
  const [profile, categories] = await Promise.all([getProfile(session.userId), listCategories()]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-1 text-xl font-bold">Publicar oferta</h1>
        <p className="mb-6 text-sm text-muted">Achou um preço bom? Em poucos passos você compartilha com a comunidade.</p>
        <PublishWizard kind="deal" categories={categories.map((c) => ({ id: c.id, name: c.name }))} trusted={!!profile?.trusted || session.role !== "user"} />
      </div>
    </div>
  );
}

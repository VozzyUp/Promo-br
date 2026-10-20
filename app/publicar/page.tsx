import { DealForm } from "@/components/forms/deal-form";
import { getProfile, listCategories } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Publicar oferta" };

export default async function PublishPage() {
  const session = await requireUser("/publicar");
  const [profile, categories] = await Promise.all([getProfile(session.userId), listCategories()]);
  const trusted = !!profile?.trusted || session.role !== "user";
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-1 text-xl font-bold">Publicar oferta</h1>
        <p className="mb-6 text-sm text-muted">Achou um preço bom? Compartilhe com a comunidade.</p>
        <DealForm categories={categories} trusted={trusted} />
      </div>
    </div>
  );
}

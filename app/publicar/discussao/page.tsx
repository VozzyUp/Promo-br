import { DiscussionForm } from "@/components/forms/discussion-form";
import { requireUser } from "@/lib/auth";
import { listCategories } from "@/lib/data";

export const metadata = { title: "Nova discussão" };

export default async function NewDiscussionPage() {
  await requireUser("/publicar/discussao");
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-1 text-xl font-bold">Nova discussão</h1>
        <p className="mb-6 text-sm text-muted">Peça uma dica, compare lojas ou puxe um assunto com a comunidade.</p>
        <DiscussionForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}

import { LegalForm } from "@/components/admin/settings-forms";
import { getLegalDoc } from "@/components/legal-from-settings";
import { requireAdmin } from "@/lib/auth";
import { LEGAL_SLUGS } from "@/lib/legal-defaults";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: páginas e textos" };
export const dynamic = "force-dynamic";

export default async function PanelPagesPage() {
  await requireAdmin();
  if (!supabaseEnabled()) return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Precisa do Supabase configurado.</p>;
  const docs = await Promise.all(LEGAL_SLUGS.map(async (slug) => ({ slug, ...(await getLegalDoc(slug)) })));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-bold">Páginas e textos</h1>
      <p className="text-sm text-muted">
        Escreva em texto simples: <code>## Título</code> para seção, <code>- item</code> para lista, <code>**negrito**</code> e <code>[texto](/endereco)</code> para link.
        Peça revisão jurídica antes de publicar os textos de privacidade e termos.
      </p>
      {docs.map((d) => (
        <details key={d.slug} className="rounded-card bg-bg p-4 shadow-card">
          <summary className="cursor-pointer font-bold">{d.title} <span className="text-sm font-normal text-muted">· /{d.slug}{d.custom ? " · editada" : " · texto padrão"}</span></summary>
          <div className="mt-4"><LegalForm slug={d.slug} title={d.title} body={d.body} custom={d.custom} /></div>
        </details>
      ))}
    </div>
  );
}
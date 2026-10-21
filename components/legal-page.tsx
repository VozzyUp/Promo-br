import type { ReactNode } from "react";

/** Moldura das páginas institucionais: título, data de atualização e texto corrido. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <article className="flex flex-col gap-4 rounded-card bg-bg p-6 shadow-card [&_h2]:mt-4 [&_h2]:text-title [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed">
        <h1 className="text-xl font-bold">{title}</h1>
        {updated ? <p className="text-sm text-muted">Atualizado em {updated}</p> : null}
        {children}
      </article>
    </div>
  );
}

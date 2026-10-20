import Link from "next/link";

/** Página provisória para rotas do inventário que ainda não foram construídas. */
export function StubPage({ title, screen, children }: { title: string; screen: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-(--layout-max) px-4 py-10">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <p className="text-xs font-bold uppercase text-muted">{screen} · em construção</p>
        <h1 className="mt-1 text-xl font-bold">{title}</h1>
        <div className="mt-3 text-sm text-muted">{children ?? "Esta página chega numa próxima etapa."}</div>
        <Link href="/" className="mt-4 inline-block text-sm font-bold text-accent">Voltar para as ofertas</Link>
      </div>
    </div>
  );
}

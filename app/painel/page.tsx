import Link from "next/link";
import { batchModerateAction, dealStaffAction } from "@/app/actions/staff";
import { moderateDealAction } from "@/app/actions/moderate";
import { formatPrice, timeAgo } from "@/lib/format";
import { listPendingDeals } from "@/lib/data";
import { requireModerator } from "@/lib/auth";

export const metadata = { title: "Painel: fila de ofertas" };

const small = "h-10 rounded-sm border border-border-input bg-bg px-2 text-sm";

export default async function PanelPage() {
  await requireModerator();
  const pending = await listPendingDeals();
  return (
    <div className="mx-auto max-w-(--layout-max) px-4 py-8">
      <h1 className="text-xl font-bold">Fila de ofertas</h1>
      <p className="mb-4 text-sm text-muted">{pending.length === 0 ? "Nada esperando aprovação." : `${pending.length} oferta(s) esperando aprovação.`}</p>

      {pending.length > 0 ? (
        <form id="batch" action={batchModerateAction} className="mb-4 flex flex-wrap items-center gap-2 rounded-card bg-bg p-3 shadow-card">
          <span className="text-sm font-bold">Marcadas:</span>
          <label htmlFor="batch-reason" className="sr-only">Motivo da recusa em lote</label>
          <input id="batch-reason" name="reason" placeholder="Motivo (para recusar)" className={`${small} w-56`} />
          <button type="submit" name="action" value="approve" className="h-10 rounded-pill bg-accent px-4 text-sm font-bold text-on-accent hover:bg-accent-hover">Aprovar marcadas</button>
          <button type="submit" name="action" value="reject" className="h-10 rounded-pill border border-danger px-4 text-sm font-bold text-danger hover:bg-surface">Recusar marcadas</button>
        </form>
      ) : null}

      <ul className="flex flex-col gap-3">
        {pending.map((d) => (
          <li key={d.id} className="flex flex-col gap-3 rounded-card bg-bg p-4 shadow-card md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 gap-3">
              <input type="checkbox" name="ids" value={d.id} form="batch" aria-label={`Marcar ${d.title}`} className="mt-1 size-5 shrink-0" />
              <div className="min-w-0">
                <Link href={`/oferta/${d.slug}`} className="font-bold hover:text-accent">{d.title}</Link>
                <p className="text-sm text-muted">
                  {d.store.name}{d.store.status === "pending_review" ? " (loja nova)" : ""} ·{" "}
                  {d.priceCents != null ? formatPrice(d.priceCents) : `cupom ${d.couponCode}`} · por {d.author.username} · {timeAgo(d.createdAt)}
                </p>
                <p className="truncate text-xs text-muted" title={d.urlSubmitted ?? undefined}>{d.urlSubmitted ?? "Sem link (loja física ou sem endereço)"}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <form action={moderateDealAction}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="action" value="approve" />
                <button type="submit" className="h-10 rounded-pill bg-accent px-4 text-sm font-bold text-on-accent hover:bg-accent-hover">Aprovar</button>
              </form>
              <form action={moderateDealAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="action" value="reject" />
                <label htmlFor={`r-${d.id}`} className="sr-only">Motivo da recusa</label>
                <input id={`r-${d.id}`} name="reason" placeholder="Motivo (opcional)" className={`${small} w-44`} />
                <button type="submit" className="h-10 rounded-pill border border-danger px-4 text-sm font-bold text-danger hover:bg-surface">Recusar</button>
              </form>
              <form action={dealStaffAction}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" name="act" value="remove" className="h-10 rounded-pill px-3 text-sm text-muted hover:bg-surface">Remover</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
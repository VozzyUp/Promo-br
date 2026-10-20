import Link from "next/link";
import { moderateDealAction } from "@/app/actions/moderate";
import { formatPrice, timeAgo } from "@/lib/format";
import { listPendingDeals } from "@/lib/data";
import { requireModerator } from "@/lib/auth";

export const metadata = { title: "Painel: fila de ofertas" };

export default async function PanelPage() {
  await requireModerator();
  const pending = await listPendingDeals();
  return (
    <div className="mx-auto max-w-(--layout-max) px-4 py-8">
      <h1 className="text-xl font-bold">Fila de ofertas</h1>
      <p className="mb-6 text-sm text-muted">{pending.length === 0 ? "Nada esperando aprovação." : `${pending.length} oferta(s) esperando aprovação.`}</p>
      <ul className="flex flex-col gap-3">
        {pending.map((d) => (
          <li key={d.id} className="flex flex-col gap-3 rounded-card bg-bg p-4 shadow-card md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Link href={`/oferta/${d.slug}`} className="font-bold hover:text-accent">{d.title}</Link>
              <p className="text-sm text-muted">
                {d.store.name}{d.store.status === "pending_review" ? " (loja nova)" : ""} ·{" "}
                {d.priceCents != null ? formatPrice(d.priceCents) : `cupom ${d.couponCode}`} · por {d.author.username} · {timeAgo(d.createdAt)}
              </p>
              <p className="truncate text-xs text-muted" title={d.urlSubmitted}>{d.urlSubmitted}</p>
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
                <input id={`r-${d.id}`} name="reason" placeholder="Motivo (opcional)" className="h-10 w-44 rounded-sm border border-border-input px-2 text-sm" />
                <button type="submit" className="h-10 rounded-pill border border-danger px-4 text-sm font-bold text-danger hover:bg-surface">Recusar</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

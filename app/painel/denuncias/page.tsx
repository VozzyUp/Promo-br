import Link from "next/link";
import { resolveReportsAction } from "@/app/actions/moderate-reports";
import { listOpenReports } from "@/lib/data/moderation";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Painel: denúncias" };

const KIND_LABEL: Record<string, string> = {
  price_changed: "Preço mudou",
  coupon_failed: "Cupom não funciona",
  out_of_stock: "Acabou",
  spam: "Spam ou propaganda",
  fake: "Falso ou enganoso",
  offensive: "Ofensivo",
};

export default async function ReportsPage() {
  const groups = await listOpenReports();
  return (
    <div className="mx-auto max-w-(--layout-max) px-4 py-6">
      <h1 className="text-xl font-bold">Denúncias</h1>
      <p className="mb-6 text-sm text-muted">
        {groups.length === 0 ? "Nenhuma denúncia em aberto." : `${groups.length} item(ns) com denúncia em aberto.`}
      </p>
      <ul className="flex flex-col gap-3">
        {groups.map((g) => (
          <li key={g.targetId} className="flex flex-col gap-3 rounded-card bg-bg p-4 shadow-card">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-muted">{g.type === "deal" ? "Oferta" : "Comentário"} · {g.status}</p>
              {g.href ? (
                <Link href={g.href} className="font-bold hover:text-accent">{g.title}</Link>
              ) : (
                <p className="font-bold">{g.title}</p>
              )}
              {g.excerpt ? <p className="mt-1 whitespace-pre-line text-sm">{g.excerpt}</p> : null}
              {g.author ? <p className="text-sm text-muted">de @{g.author}</p> : null}
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {g.reports.map((r, i) => (
                <li key={i} className="text-muted">
                  <strong className="text-text">{KIND_LABEL[r.kind] ?? r.kind}</strong>
                  {r.by ? ` · @${r.by}` : ""} · {timeAgo(r.at)}
                  {r.note ? ` · "${r.note}"` : ""}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <form action={resolveReportsAction}>
                <input type="hidden" name="id" value={g.targetId} />
                <input type="hidden" name="type" value={g.type} />
                <input type="hidden" name="outcome" value="dismiss" />
                <button type="submit" className="h-10 rounded-pill border border-border px-4 text-sm font-bold hover:bg-surface">Ignorar denúncias</button>
              </form>
              <form action={resolveReportsAction}>
                <input type="hidden" name="id" value={g.targetId} />
                <input type="hidden" name="type" value={g.type} />
                <input type="hidden" name="outcome" value="remove" />
                <button type="submit" className="h-10 rounded-pill border border-danger px-4 text-sm font-bold text-danger hover:bg-surface">Tirar do ar</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { db } from "@/lib/supabase/db";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: métricas" };
export const dynamic = "force-dynamic";

type Metrics = {
  clicks_24h: number; clicks_7d: number; clicks_period: number;
  by_channel: Record<string, number>;
  by_day: { day: string; n: number }[];
  top_deals: { slug: string; title: string; n: number }[];
  by_store: { name: string; clicks: number; sales: number; commission_cents: number }[];
  conv: { count: number; sale_cents: number; commission_cents: number; pending_cents: number };
};

const CHANNEL: Record<string, string> = { site: "Site", telegram: "Telegram", whatsapp: "WhatsApp", instagram: "Instagram", other: "Outros" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card bg-bg p-4 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function PanelMetricsPage({ searchParams }: PageProps<"/painel/metricas">) {
  await requireAdmin();
  if (!supabaseEnabled()) return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Precisa do Supabase configurado.</p>;
  const sp = await searchParams;
  const raw = Number(Array.isArray(sp.dias) ? sp.dias[0] : sp.dias);
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const { data, error } = await db().rpc("admin_metrics", { p_days: days });
  if (error) throw error;
  const m = data as Metrics;
  const max = Math.max(1, ...m.by_day.map((d) => d.n));
  const noSales = m.by_store.filter((s) => s.sales === 0);
  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Métricas</h1>
        <nav aria-label="Período" className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`?dias=${d}`} aria-current={d === days ? "page" : undefined} className={`rounded-pill px-3 py-1 text-sm font-bold ${d === days ? "bg-accent text-on-accent" : "hover:bg-surface"}`}>{d} dias</Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cliques nas últimas 24 h" value={String(m.clicks_24h)} />
        <Stat label="Cliques em 7 dias" value={String(m.clicks_7d)} />
        <Stat label={`Cliques em ${days} dias`} value={String(m.clicks_period)} hint="1 por visitante, oferta e dia; sem robôs" />
        <Stat label="Vendas no período" value={String(m.conv.count)} hint={`${formatPrice(m.conv.sale_cents)} em compras`} />
        <Stat label="Comissão estimada" value={formatPrice(m.conv.commission_cents)} hint="Tudo que não foi cancelado" />
        <Stat label="Comissão pendente" value={formatPrice(m.conv.pending_cents)} hint="Ainda não aprovada pela loja" />
      </div>

      <section aria-labelledby="dia" className="rounded-card bg-bg p-4 shadow-card">
        <h2 id="dia" className="mb-3 text-title font-bold">Cliques por dia</h2>
        {m.by_day.length === 0 ? <p className="text-sm text-muted">Sem cliques no período.</p> : (
          <ol className="flex h-32 items-end gap-1" aria-label="Cliques por dia">
            {m.by_day.map((d) => (
              <li key={d.day} className="flex flex-1 flex-col items-center justify-end" title={`${d.day}: ${d.n}`}>
                <div className="w-full rounded-t-xs bg-accent" style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} />
                <span className="sr-only">{d.day}: {d.n} cliques</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="canal" className="rounded-card bg-bg p-4 shadow-card">
          <h2 id="canal" className="mb-3 text-title font-bold">Por canal</h2>
          <ul className="divide-y divide-border text-sm">
            {Object.entries(m.by_channel).length === 0 ? <li className="py-2 text-muted">Sem dados.</li> : null}
            {Object.entries(m.by_channel).sort((a, b) => b[1] - a[1]).map(([c, n]) => <li key={c} className="flex justify-between py-2"><span>{CHANNEL[c] ?? c}</span><strong>{n}</strong></li>)}
          </ul>
        </section>
        <section aria-labelledby="top" className="rounded-card bg-bg p-4 shadow-card">
          <h2 id="top" className="mb-3 text-title font-bold">Ofertas mais clicadas</h2>
          <ol className="divide-y divide-border text-sm">
            {m.top_deals.length === 0 ? <li className="py-2 text-muted">Sem dados.</li> : null}
            {m.top_deals.map((d) => <li key={d.slug} className="flex justify-between gap-3 py-2"><Link href={`/oferta/${d.slug}`} className="min-w-0 truncate hover:text-accent">{d.title}</Link><strong>{d.n}</strong></li>)}
          </ol>
        </section>
      </div>

      <section aria-labelledby="lojas" className="rounded-card bg-bg p-4 shadow-card">
        <h2 id="lojas" className="mb-1 text-title font-bold">Por loja</h2>
        <p className="mb-3 text-sm text-muted">{noSales.length > 0 ? `${noSales.length} loja(s) com cliques e nenhuma venda registrada: confira se o cadastro de afiliado dessas lojas está feito.` : "Todas as lojas com clique têm venda registrada."}</p>
        <table className="w-full text-left text-sm">
          <thead><tr className="text-muted"><th className="py-1 font-normal">Loja</th><th className="font-normal">Cliques</th><th className="font-normal">Vendas</th><th className="font-normal">Comissão</th></tr></thead>
          <tbody>
            {m.by_store.map((s) => (
              <tr key={s.name} className="border-t border-border">
                <td className="py-2 font-bold">{s.name}</td><td>{s.clicks}</td>
                <td className={s.sales === 0 ? "text-danger" : ""}>{s.sales}</td><td>{formatPrice(s.commission_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
import { requireUser } from "@/lib/auth";
import { getUserStats } from "@/lib/data/gamification";

export const metadata = { title: "Estatísticas" };

const GOAL_HOT = 15;
const GOAL_HELPED = 20;

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-sm bg-surface p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm">{label}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-bg p-4 shadow-card md:p-6">
      <h2 className="mb-3 text-title font-bold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

export default async function StatsPage() {
  const session = await requireUser("/conta/estatisticas");
  const s = await getUserStats(session.userId);
  const n = (k: string) => s[k] ?? 0;
  const hotPct = n("deals_12m") > 0 ? Math.round((n("hot_12m") / n("deals_12m")) * 100) : 0;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Estatísticas</h1>
        <p className="text-sm text-muted">Só você vê esta página.</p>
      </div>
      <Block title="Suas ofertas">
        <Stat label="Ofertas no ar" value={n("deals_active")} />
        <Stat label="Interações" value={n("interactions_deals")} hint="votos e comentários nas suas ofertas" />
        <Stat label="Ofertas hot" value={`${hotPct}%`} hint={`${n("hot_12m")} de ${n("deals_12m")} nos últimos 12 meses`} />
        <Stat label="Temperatura média" value={`${n("hot_avg")}°`} />
        <Stat label="Temperatura mais alta" value={`${n("hot_max")}°`} />
        <Stat label="Mais comentada" value={n("max_comments_on_deal")} hint="comentários numa só oferta" />
      </Block>
      <Block title="Seus comentários">
        <Stat label="Comentários ativos" value={n("comments_total")} />
        <Stat label="Reações recebidas" value={n("reactions_received")} />
        <Stat label="Considerados úteis" value={n("helpful_comments")} />
      </Block>
      <Block title="Sua comunidade">
        <Stat label="Seguidores" value={n("followers")} />
        <Stat label="Discussões abertas" value={n("discussions")} />
      </Block>
      <Block title="Seus votos">
        <Stat label="Votos no total" value={n("votes_total")} />
        <Stat label="Votos nos últimos 30 dias" value={n("votes_month")} hint={`em ${n("categories_voted_month")} categorias`} />
        <Stat label="Ofertas que ficaram hot" value={`${n("votes_on_hot")} de ${GOAL_HOT}`} hint="onde você votou quente (meta do mês)" />
        <Stat label="Pessoas ajudadas" value={`${Math.min(n("votes_month"), GOAL_HELPED)} de ${GOAL_HELPED}`} hint="votos no mês, meta de 20" />
      </Block>
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { LEVELS } from "@/lib/badges";
import { getPoints } from "@/lib/data/gamification";

export const metadata = { title: "Pontos e níveis" };

const FAQ = [
  { q: "O que é o Club?", a: "É o jeito de a comunidade reconhecer quem ajuda os outros: publicar boas ofertas, votar com critério e comentar com utilidade rende pontos e níveis." },
  { q: "Como ganho pontos?", a: "Quando uma oferta sua chega a 100° você ganha 10. Quando um comentário seu recebe 3 reações de útil, mais 10. Votar em 3 ofertas na mesma semana vale 1 ponto, e ficar semanas seguidas votando dá bônus." },
  { q: "Posso perder pontos?", a: "Os pontos contam os últimos 12 meses. Os mais antigos saem da conta com o tempo, então o melhor é manter o ritmo." },
  { q: "E os benefícios do nível?", a: "Por enquanto cada nível mostra o selo no seu perfil. Os próximos benefícios chegam depois da Black Friday." },
];

export default async function PointsPage() {
  const session = await requireUser("/conta/pontos");
  const p = await getPoints(session.userId);
  const { current, next, missing } = p.level;
  const pct = next ? Math.min(100, Math.round(((p.total - (current?.from ?? 0)) / (next.from - (current?.from ?? 0))) * 100)) : 100;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Pontos e níveis</h1>

      <section aria-labelledby="total" className="rounded-card bg-bg p-4 shadow-card md:p-6">
        <p className="text-sm text-muted">Seus pontos (últimos 12 meses)</p>
        <p id="total" className="text-display font-bold">{p.total}</p>
        <p className="mt-1 text-sm">
          {current ? <>Nível atual: <strong>{current.name}</strong>. </> : "Você ainda não tem nível. "}
          {next ? <>Faltam <strong>{missing}</strong> pontos para o nível <strong>{next.name}</strong>.</> : "Você está no nível mais alto."}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-pill bg-surface" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso para o próximo nível">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {LEVELS.map((l) => (
            <li key={l.id} className={`rounded-sm border p-3 ${current?.id === l.id ? "border-accent bg-accent-soft" : "border-border"}`}>
              <p className="font-bold">{l.name}</p>
              <p className="text-muted">{l.from} pontos</p>
              <p className="mt-1">{l.perks.join(", ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="como" className="rounded-card bg-bg p-4 shadow-card md:p-6">
        <h2 id="como" className="mb-3 text-title font-bold">De onde vieram seus pontos</h2>
        <ul className="flex flex-col divide-y divide-border text-sm">
          <li className="flex justify-between gap-3 py-2"><span>Ofertas que chegaram a 100° (+10 cada)</span><strong>{p.hot}</strong></li>
          <li className="flex justify-between gap-3 py-2"><span>Comentários considerados úteis (+10 cada)</span><strong>{p.helpful}</strong></li>
          <li className="flex justify-between gap-3 py-2"><span>Semanas com 3 votos ou mais (+1 cada)</span><strong>{p.weekly}</strong></li>
          <li className="flex justify-between gap-3 py-2"><span>Bônus de sequência de semanas</span><strong>{p.streakBonus}</strong></li>
        </ul>
        <div className="mt-4 rounded-sm bg-surface p-3 text-sm">
          <p>
            Esta semana: <strong>{Math.min(p.votesThisWeek, 3)} de 3 votos</strong>
            {p.weekDone ? " (ponto da semana garantido)" : ""}.
          </p>
          <p className="mt-1">
            Sequência atual: <strong>{p.streakWeeks} {p.streakWeeks === 1 ? "semana" : "semanas"}</strong>. Bônus em 2 semanas (+1), 5 (+5) e 10 (+10).
          </p>
        </div>
      </section>

      <section aria-labelledby="faq" className="rounded-card bg-bg p-4 shadow-card md:p-6">
        <h2 id="faq" className="mb-3 text-title font-bold">Perguntas frequentes</h2>
        <div className="flex flex-col divide-y divide-border">
          {FAQ.map((f) => (
            <details key={f.q} className="py-3">
              <summary className="cursor-pointer font-bold">{f.q}</summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

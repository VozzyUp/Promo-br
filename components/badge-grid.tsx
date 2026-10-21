import { Award, Check, Lock } from "lucide-react";
import type { ChainProgress } from "@/lib/badges";

/** Todas as medalhas, por corrente: conquistada, em andamento (com barra) ou bloqueada. */
export function BadgeGrid({ chains }: { chains: ChainProgress[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {chains.map((chain) => (
        <li key={chain.id} className="rounded-card bg-bg p-4 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase text-muted">{chain.title}</h2>
          <ul className="flex flex-col gap-3">
            {chain.tiers.map((t) => {
              const pct = Math.round((t.current / t.target) * 100);
              return (
                <li key={t.key} className={`flex gap-3 ${t.locked ? "opacity-50" : ""}`}>
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-pill ${t.earned ? "bg-price-soft text-price" : "bg-surface text-muted"}`}
                    aria-hidden
                  >
                    {t.earned ? <Check className="size-5" /> : t.locked ? <Lock className="size-4" /> : <Award className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {t.name}
                      <span className="sr-only">{t.earned ? " (conquistada)" : t.locked ? " (bloqueada)" : " (em andamento)"}</span>
                    </p>
                    <p className="text-sm text-muted">{t.description}</p>
                    {!t.earned && !t.locked ? (
                      <div className="mt-1.5">
                        <div className="h-1.5 overflow-hidden rounded-pill bg-surface" role="progressbar" aria-valuenow={t.current} aria-valuemin={0} aria-valuemax={t.target} aria-label={`Progresso: ${t.name}`}>
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{t.current} de {t.target}</p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

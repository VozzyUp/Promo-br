// Medalhas e níveis do Club. Funções puras: recebem os números do perfil e devolvem o progresso.
// Nomes e textos escritos para o promo-br; as regras (quantos votos, comentários etc.) seguem o padrão de comunidades de ofertas.

export type Stats = Partial<Record<string, number>>;

export type BadgeTier = { key: string; name: string; target: number; description: string };
export type BadgeChain = {
  id: string;
  title: string;
  metric: string;
  tiers: readonly [BadgeTier, BadgeTier, BadgeTier] | readonly [BadgeTier];
};

export const BADGE_CHAINS: readonly BadgeChain[] = [
  {
    id: "votes", title: "Votos", metric: "votes_total",
    tiers: [
      { key: "olho-vivo", name: "Olho vivo", target: 50, description: "Votou em 50 ofertas" },
      { key: "curador", name: "Curador", target: 250, description: "Votou em 250 ofertas" },
      { key: "juri-popular", name: "Júri popular", target: 1000, description: "Votou em 1.000 ofertas" },
    ],
  },
  {
    id: "deals", title: "Ofertas publicadas", metric: "deals_total",
    tiers: [
      { key: "garimpeiro", name: "Garimpeiro", target: 10, description: "Publicou 10 ofertas" },
      { key: "cacador", name: "Caçador de promo", target: 40, description: "Publicou 40 ofertas" },
      { key: "lenda", name: "Lenda das promos", target: 150, description: "Publicou 150 ofertas" },
    ],
  },
  {
    id: "comments", title: "Comentários", metric: "comments_total",
    tiers: [
      { key: "prosa", name: "Prosa", target: 25, description: "Fez 25 comentários" },
      { key: "debatedor", name: "Debatedor", target: 100, description: "Fez 100 comentários" },
      { key: "orador", name: "Orador", target: 500, description: "Fez 500 comentários" },
    ],
  },
  {
    id: "hot", title: "Temperatura", metric: "hot_max",
    tiers: [
      { key: "faisca", name: "Faísca", target: 100, description: "Teve uma oferta com 100° ou mais" },
      { key: "brasa", name: "Brasa", target: 500, description: "Teve uma oferta com 500° ou mais" },
      { key: "incendio", name: "Incêndio", target: 1000, description: "Teve uma oferta com 1.000° ou mais" },
    ],
  },
  {
    id: "popular", title: "Assunto da vez", metric: "max_comments_on_deal",
    tiers: [
      { key: "roda-de-conversa", name: "Roda de conversa", target: 20, description: "Uma oferta sua passou de 20 comentários" },
      { key: "assunto-do-dia", name: "Assunto do dia", target: 50, description: "Uma oferta sua passou de 50 comentários" },
      { key: "fenomeno", name: "Fenômeno", target: 100, description: "Uma oferta sua passou de 100 comentários" },
    ],
  },
  {
    id: "likes", title: "Carinho", metric: "likes_received",
    tiers: [
      { key: "simpatico", name: "Simpático", target: 25, description: "Recebeu 25 curtidas em comentários" },
      { key: "querido", name: "Querido", target: 100, description: "Recebeu 100 curtidas em comentários" },
      { key: "estrela", name: "Estrela", target: 400, description: "Recebeu 400 curtidas em comentários" },
    ],
  },
  {
    id: "helpful", title: "Ajuda", metric: "helpful_comments",
    tiers: [
      { key: "prestativo", name: "Prestativo", target: 5, description: "5 comentários considerados úteis" },
      { key: "guia", name: "Guia", target: 20, description: "20 comentários considerados úteis" },
      { key: "mentor", name: "Mentor", target: 60, description: "60 comentários considerados úteis" },
    ],
  },
  {
    id: "profile", title: "Perfil", metric: "profile_complete",
    tiers: [{ key: "perfil-completo", name: "Perfil completo", target: 1, description: "Colocou foto e uma descrição no perfil" }],
  },
];

export type TierProgress = BadgeTier & { earned: boolean; locked: boolean; current: number };
export type ChainProgress = { id: string; title: string; tiers: TierProgress[] };

/** Cada degrau só destrava depois do anterior; o progresso mostrado nunca passa do alvo. */
export function computeBadges(stats: Stats): ChainProgress[] {
  return BADGE_CHAINS.map((chain) => {
    const value = stats[chain.metric] ?? 0;
    let previousEarned = true;
    const tiers = chain.tiers.map((t): TierProgress => {
      const earned = value >= t.target;
      const locked = !previousEarned;
      previousEarned = earned;
      return { ...t, earned, locked, current: Math.min(value, t.target) };
    });
    return { id: chain.id, title: chain.title, tiers };
  });
}

export function earnedBadgeKeys(stats: Stats): string[] {
  return computeBadges(stats).flatMap((c) => c.tiers.filter((t) => t.earned).map((t) => t.key));
}

export function badgeName(key: string): string | null {
  for (const c of BADGE_CHAINS) for (const t of c.tiers) if (t.key === key) return t.name;
  return null;
}

/* ---------------------------------------------------------------- níveis do Club */

export const LEVELS = [
  { id: "prata", name: "Prata", from: 10, perks: ["Selo de nível no perfil"] },
  { id: "ouro", name: "Ouro", from: 40, perks: ["Selo de nível no perfil"] },
  { id: "platina", name: "Platina", from: 300, perks: ["Selo de nível no perfil"] },
] as const;

export function levelFor(points: number) {
  const reached = LEVELS.filter((l) => points >= l.from);
  const current = reached[reached.length - 1] ?? null;
  const next = LEVELS.find((l) => points < l.from) ?? null;
  return { current, next, missing: next ? next.from - points : 0 };
}

/* ---------------------------------------------------------------- semana de votação */

/** Chave de semana ISO (ex.: 2026-W43) no fuso de São Paulo, igual à gravada pelo banco. */
export function weekKey(date: Date): string {
  const local = new Date(date.getTime() - 3 * 3600_000); // UTC-3, sem horário de verão
  const day = (local.getUTCDay() + 6) % 7; // segunda = 0
  const thursday = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day + 3));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Semanas seguidas com 3+ votos. A semana em curso ainda pode ser ganha, então não quebra a sequência. */
export function currentStreak(earnedWeeks: string[], now: Date): number {
  const have = new Set(earnedWeeks);
  let streak = 0;
  let cursor = new Date(now);
  if (!have.has(weekKey(cursor))) cursor = new Date(cursor.getTime() - 7 * 86400_000);
  while (have.has(weekKey(cursor)) && streak < 200) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 7 * 86400_000);
  }
  return streak;
}

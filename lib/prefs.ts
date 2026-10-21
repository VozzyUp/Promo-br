// Preferências da conta (guardadas em user_settings.prefs) e o catálogo de notificações.
// Notificação ausente do mapa conta como LIGADA: o banco só silencia quando o valor é false.

export const NOTIFY_GROUPS = [
  {
    id: "mentions",
    title: "Menções",
    items: [{ kind: "mention", label: "Quando alguém me mencionar com @" }],
  },
  {
    id: "deals",
    title: "Minhas ofertas",
    items: [
      { kind: "comment", label: "Quando alguém comentar numa oferta minha" },
      { kind: "deal_hot", label: "Quando uma oferta minha ficar hot (100°)" },
      { kind: "deal_expired", label: "Quando uma oferta minha for encerrada" },
      { kind: "deal_approved", label: "Quando uma oferta minha for aprovada" },
      { kind: "deal_rejected", label: "Quando uma oferta minha for recusada" },
    ],
  },
  {
    id: "following",
    title: "O que eu acompanho",
    items: [
      { kind: "subscribed_comment", label: "Quando alguém comentar numa oferta que eu sigo" },
      { kind: "follow_post", label: "Quando alguém que eu sigo publicar" },
      { kind: "alert_match", label: "Quando uma oferta combinar com um alerta meu" },
    ],
  },
  {
    id: "comments",
    title: "Meus comentários",
    items: [
      { kind: "reply", label: "Quando alguém responder ao meu comentário" },
      { kind: "reaction", label: "Quando alguém reagir ao meu comentário" },
      { kind: "helpful", label: "Quando meu comentário for considerado útil" },
    ],
  },
  {
    id: "points",
    title: "Pontos e medalhas",
    items: [
      { kind: "level_up", label: "Quando eu subir de nível" },
      { kind: "badge", label: "Quando eu ganhar uma medalha" },
    ],
  },
  {
    id: "messages",
    title: "Mensagens",
    items: [{ kind: "message", label: "Quando eu receber uma mensagem" }],
  },
] as const;

export type NotifyKind = (typeof NOTIFY_GROUPS)[number]["items"][number]["kind"];

export const HOME_TABS = [
  { id: "paravoce", label: "Pra você" },
  { id: "quentes", label: "Mais quentes" },
  { id: "descontos", label: "Maiores descontos" },
  { id: "novas", label: "Novas" },
] as const;

export type HomeTab = (typeof HOME_TABS)[number]["id"];

export type Prefs = {
  notify: Partial<Record<NotifyKind, boolean>>;
  auto_subscribe: boolean;
  home_tab: HomeTab;
  infinite_scroll: boolean;
  widgets: { hot: boolean; categories: boolean; coupons: boolean; discussions: boolean };
  allow_follow: boolean;
  allow_messages: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  notify: {},
  auto_subscribe: true,
  home_tab: "quentes",
  infinite_scroll: true,
  widgets: { hot: true, categories: true, coupons: true, discussions: true },
  allow_follow: true,
  allow_messages: true,
};

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Lê o JSON salvo, ignorando o que não for válido (nunca confia no formato guardado). */
export function resolvePrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const w = (r.widgets && typeof r.widgets === "object" ? r.widgets : {}) as Record<string, unknown>;
  const known = new Set<string>(NOTIFY_GROUPS.flatMap((g) => g.items.map((i) => i.kind)));
  const notify: Prefs["notify"] = {};
  if (r.notify && typeof r.notify === "object") {
    for (const [k, v] of Object.entries(r.notify)) {
      if (known.has(k) && typeof v === "boolean") notify[k as NotifyKind] = v;
    }
  }
  return {
    notify,
    auto_subscribe: bool(r.auto_subscribe, DEFAULT_PREFS.auto_subscribe),
    home_tab: HOME_TABS.find((t) => t.id === r.home_tab)?.id ?? DEFAULT_PREFS.home_tab,
    infinite_scroll: bool(r.infinite_scroll, DEFAULT_PREFS.infinite_scroll),
    widgets: {
      hot: bool(w.hot, true),
      categories: bool(w.categories, true),
      coupons: bool(w.coupons, true),
      discussions: bool(w.discussions, true),
    },
    allow_follow: bool(r.allow_follow, DEFAULT_PREFS.allow_follow),
    allow_messages: bool(r.allow_messages, DEFAULT_PREFS.allow_messages),
  };
}

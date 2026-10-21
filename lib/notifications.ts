// Texto e destino de cada tipo de notificação. Função pura: serve ao cabeçalho, à página e aos testes.

export type NotificationRow = {
  id: number;
  kind: string;
  actor: string | null;
  dealSlug: string | null;
  dealTitle: string | null;
  commentId: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationFilter = "todas" | "ofertas" | "comentarios" | "pontos";

export const FILTER_KINDS: Record<Exclude<NotificationFilter, "todas">, string[]> = {
  ofertas: ["deal_hot", "deal_expired", "deal_approved", "deal_rejected", "follow_post", "alert_match"],
  comentarios: ["mention", "comment", "reply", "subscribed_comment", "reaction", "helpful"],
  pontos: ["level_up", "badge", "helpful"],
};

const LEVELS: Record<string, string> = { prata: "Prata", ouro: "Ouro", platina: "Platina" };
const REACTION_TEXT: Record<string, string> = {
  like: "curtiu o seu comentário",
  helpful: "achou útil o seu comentário",
  haha: "riu do seu comentário",
};

export function describeNotification(n: NotificationRow): { text: string; href: string } {
  const who = n.actor ?? "Alguém";
  const title = n.dealTitle ? `"${n.dealTitle}"` : "uma oferta";
  const dealHref = n.dealSlug ? `/oferta/${n.dealSlug}${n.commentId ? `#c-${n.commentId}` : ""}` : "/";
  switch (n.kind) {
    case "mention":
      return { text: `${who} mencionou você em ${title}`, href: dealHref };
    case "comment":
      return { text: `${who} comentou na sua oferta ${title}`, href: dealHref };
    case "reply":
      return { text: `${who} respondeu ao seu comentário em ${title}`, href: dealHref };
    case "subscribed_comment":
      return { text: `${who} comentou em ${title}`, href: dealHref };
    case "reaction": {
      const what = REACTION_TEXT[String(n.data.reaction ?? "like")] ?? "reagiu ao seu comentário";
      return { text: `${who} ${what} em ${title}`, href: dealHref };
    }
    case "helpful":
      return { text: `Seu comentário em ${title} foi considerado útil (+10 pontos)`, href: dealHref };
    case "deal_hot":
      return { text: `Sua oferta ${title} ficou hot! (+10 pontos)`, href: dealHref };
    case "deal_expired":
      return { text: `A oferta ${title} foi encerrada`, href: dealHref };
    case "deal_approved":
      return { text: `Sua oferta ${title} foi aprovada e já está no ar`, href: dealHref };
    case "deal_rejected": {
      const reason = typeof n.data.reason === "string" && n.data.reason ? `: ${n.data.reason}` : "";
      return { text: `Sua oferta ${title} não foi aprovada${reason}`, href: dealHref };
    }
    case "follow_post":
      return { text: `${who} publicou ${title}`, href: dealHref };
    case "alert_match":
      return { text: `Uma oferta combina com um alerta seu: ${title}`, href: dealHref };
    case "level_up": {
      const level = LEVELS[String(n.data.level ?? "")] ?? "novo";
      return { text: `Você subiu para o nível ${level} do Club`, href: "/conta/pontos" };
    }
    case "badge":
      return { text: `Você ganhou a medalha "${String(n.data.name ?? "nova")}"`, href: "/conta/medalhas" };
    case "message":
      return { text: `${who} mandou uma mensagem para você`, href: n.actor ? `/conta/mensagens/${n.actor}` : "/conta/mensagens" };
    default:
      return { text: "Você tem uma novidade", href: "/" };
  }
}

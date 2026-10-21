// Escolha de cookies do visitante, guardada em um cookie do próprio site (não identifica ninguém).
export const CONSENT_COOKIE = "promo-br-consent";
export const CONSENT_EVENT = "promo-br:consent";
export const CONSENT_DAYS = 180;

/** all: aceitou anúncios personalizados; essential: só o necessário; none: ainda não escolheu. */
export type Consent = "all" | "essential" | "none";

export function parseConsent(cookieHeader: string): Consent {
  const m = cookieHeader.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return m?.[1] === "all" || m?.[1] === "essential" ? m[1] : "none";
}

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
export const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "";

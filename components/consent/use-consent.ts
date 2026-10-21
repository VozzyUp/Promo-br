"use client";
import { useSyncExternalStore } from "react";
import { CONSENT_COOKIE, CONSENT_DAYS, CONSENT_EVENT, parseConsent, type Consent } from "@/lib/consent";

function subscribe(cb: () => void) {
  window.addEventListener(CONSENT_EVENT, cb);
  return () => window.removeEventListener(CONSENT_EVENT, cb);
}

/** No servidor devolve null (ainda não dá para saber), para o aviso não piscar na primeira pintura. */
export function useConsent(): Consent | null {
  return useSyncExternalStore<Consent | null>(subscribe, () => parseConsent(document.cookie), () => null);
}

export function saveConsent(value: Consent) {
  const maxAge = value === "none" ? 0 : CONSENT_DAYS * 86400;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

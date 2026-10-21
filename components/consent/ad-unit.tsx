"use client";
import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_SLOT } from "@/lib/consent";
import { useConsent } from "./use-consent";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/** Unidade do AdSense dentro do espaço reservado. Sem aceite ou sem ID configurado, não renderiza nada. */
export function AdUnit({ minHeight }: { minHeight: number }) {
  const consent = useConsent();
  const pushed = useRef(false);
  const live = consent === "all" && !!ADSENSE_CLIENT && !!ADSENSE_SLOT;
  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch (e) {
      console.error("[ads] falha ao carregar anúncio", e);
    }
  }, [live]);
  if (!live) return null;
  return (
    <ins
      className="adsbygoogle block"
      style={{ minHeight }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={ADSENSE_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

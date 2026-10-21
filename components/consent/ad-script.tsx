"use client";
import Script from "next/script";
import { ADSENSE_CLIENT } from "@/lib/consent";
import { useConsent } from "./use-consent";

/** Só injeta o script do AdSense depois do aceite. */
export function AdScript() {
  const consent = useConsent();
  if (consent !== "all" || !ADSENSE_CLIENT) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`}
    />
  );
}

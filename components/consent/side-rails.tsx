"use client";
import { AdUnit } from "./ad-unit";
import { useAdsConfig } from "./ads-context";
import { useConsent } from "./use-consent";

/** Faixas de anúncio dos dois lados do conteúdo. Só em telas largas (1400px+), onde sobra espaço, e só com anúncios ligados e aceitos. */
export function SideRails() {
  const { client, slot } = useAdsConfig();
  const consent = useConsent();
  if (consent !== "all" || !client || !slot) return null;
  const rail = "pointer-events-none absolute inset-y-0 hidden w-40 min-[1400px]:block";
  return (
    <>
      <div className={`${rail} left-[calc(50%-688px)]`}><Rail /></div>
      <div className={`${rail} right-[calc(50%-688px)]`}><Rail /></div>
    </>
  );
}

function Rail() {
  return (
    <aside aria-label="Publicidade" className="pointer-events-auto sticky top-32 mt-4">
      <p className="mb-1 text-xs text-muted">Publicidade</p>
      <AdUnit minHeight={600} format="vertical" />
    </aside>
  );
}

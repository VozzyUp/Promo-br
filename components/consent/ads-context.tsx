"use client";
import { createContext, useContext, type ReactNode } from "react";

export type AdsConfig = { client: string; slot: string };

const Ctx = createContext<AdsConfig>({ client: "", slot: "" });

/** Leva o ID do AdSense (definido no painel ou no ambiente) do servidor para os componentes de anúncio. */
export function AdsProvider({ config, children }: { config: AdsConfig; children: ReactNode }) {
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export const useAdsConfig = () => useContext(Ctx);
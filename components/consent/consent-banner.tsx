"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { saveConsent, useConsent } from "./use-consent";

/** Aviso de cookies: aparece até o visitante escolher. Recusar é tão fácil quanto aceitar. */
export function ConsentBanner() {
  const consent = useConsent();
  if (consent !== "none") return null;
  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg p-4 shadow-card">
      <div className="mx-auto flex max-w-(--layout-max) flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-text md:max-w-2xl">
          Usamos cookies essenciais para o site funcionar. Com a sua permissão, parceiros de publicidade também usam cookies
          para mostrar anúncios. Veja os detalhes na <Link href="/privacidade" className="font-bold text-accent underline">política de privacidade</Link>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => saveConsent("essential")}>Só o essencial</Button>
          <Button type="button" onClick={() => saveConsent("all")}>Aceitar anúncios</Button>
        </div>
      </div>
    </div>
  );
}

/** Link do rodapé para mudar de ideia depois. */
export function ConsentReset() {
  return (
    <button type="button" onClick={() => saveConsent("none")} className="hover:text-text">
      Preferências de cookies
    </button>
  );
}

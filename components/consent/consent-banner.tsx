"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { saveConsent, useConsent } from "./use-consent";

/** Aviso de cookies: aparece até o visitante escolher. Recusar é tão fácil quanto aceitar. No celular fica compacto e acima da barra inferior. */
export function ConsentBanner() {
  const consent = useConsent();
  if (consent !== "none") return null;
  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-16 z-50 border-t border-border bg-bg p-3 shadow-card md:bottom-0 md:p-4">
      <div className="mx-auto flex max-w-(--layout-max) flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
        <p className="text-xs text-text md:max-w-2xl md:text-sm">
          Usamos cookies essenciais para o site funcionar. Com a sua permissão, parceiros de publicidade também usam cookies
          para mostrar anúncios. Veja a <Link href="/privacidade" className="font-bold text-accent underline">política de privacidade</Link>.
        </p>
        <div className="flex gap-2 [&>button]:flex-1 md:[&>button]:flex-none">
          <Button type="button" size="sm" variant="secondary" onClick={() => saveConsent("essential")}>Só o essencial</Button>
          <Button type="button" size="sm" onClick={() => saveConsent("all")}>Aceitar anúncios</Button>
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
"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/** Compartilha o link da oferta: usa o menu do celular quando existe; no computador, copia o link. */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pessoa fechou o menu de compartilhar ou o navegador bloqueou a cópia: nada a fazer.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copiado" : "Compartilhar"}
      title={copied ? "Link copiado" : "Compartilhar"}
      className="grid size-9 place-items-center rounded-sm text-muted hover:bg-surface"
    >
      {copied ? <Check className="size-4 text-price" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      <span className="sr-only" role="status">{copied ? "Link copiado" : ""}</span>
    </button>
  );
}

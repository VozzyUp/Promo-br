"use client";

import { Check } from "lucide-react";
import { useState } from "react";

/** Botão + "aba" com o fim do código. Um clique copia o código e abre a loja via /ir/. */
export function CouponCTA({ code, couponCode, size = "md" }: { code: string; couponCode: string; size?: "md" | "lg" }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
    } catch {
      window.prompt("Copie o código:", couponCode);
    }
    window.open(`/ir/${code}`, "_blank", "noopener");
  }

  const tail = couponCode.slice(-3);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copiar o código ${couponCode} e abrir a loja`}
      className={`group relative flex items-center overflow-hidden rounded-pill bg-accent font-bold text-on-accent hover:bg-accent-hover ${size === "lg" ? "h-14 w-full text-base" : "h-10 min-w-56 text-sm"}`}
    >
      <span className="flex-1 px-6 text-center">{copied ? "Código copiado!" : size === "lg" ? "Usar cupom" : "Pegar cupom e ir à loja"}</span>
      <span className="flex h-full items-center rounded-r-pill border-2 border-dashed border-accent bg-bg pl-3 pr-4 font-mono text-accent transition-[padding] duration-(--motion-base) group-hover:pl-5">
        {copied ? <Check className="size-4" aria-hidden /> : <>…{tail}</>}
      </span>
      <span role="status" className="sr-only">{copied ? "Código copiado" : ""}</span>
    </button>
  );
}

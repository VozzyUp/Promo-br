"use client";

import { Ban, Flag, TimerOff } from "lucide-react";
import { useState, useTransition } from "react";
import { markExpiredAction } from "@/app/actions/comment";
import { ReportDialog } from "@/components/report-dialog";

type Props = {
  dealId: string;
  hasCoupon: boolean;
  canClose: boolean;
  loggedIn: boolean;
};

const trigger = "inline-flex h-9 items-center gap-1.5 rounded-pill border border-border px-3 text-sm font-bold hover:bg-surface";

/** Ações da comunidade na página da oferta: avisar que acabou, denunciar e (autor/equipe) encerrar. */
export function DealToolbar({ dealId, hasCoupon, canClose, loggedIn }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const expiredKinds = [
    { value: "out_of_stock", label: "Acabou ou a oferta foi encerrada" },
    ...(hasCoupon ? [{ value: "coupon_failed", label: "O cupom não funciona" }] : []),
    { value: "price_changed", label: "O preço mudou" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ReportDialog
        target="deal"
        id={dealId}
        kinds={expiredKinds}
        title="A oferta acabou?"
        description="Seu aviso ajuda quem vem depois. Quando 3 pessoas avisam que acabou, a oferta sai do ar sozinha."
        loggedIn={loggedIn}
        triggerClassName={trigger}
      >
        <TimerOff className="size-4" aria-hidden /> Oferta expirada?
      </ReportDialog>
      <ReportDialog
        target="deal"
        id={dealId}
        kinds={[
          { value: "spam", label: "Spam ou propaganda" },
          { value: "fake", label: "Desconto falso ou enganoso" },
        ]}
        title="Denunciar oferta"
        description="A equipe revisa cada denúncia. Não precisa ter certeza: conte o que você viu."
        loggedIn={loggedIn}
        triggerClassName={trigger}
      >
        <Flag className="size-4" aria-hidden /> Denunciar
      </ReportDialog>
      {canClose ? (
        confirming ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await markExpiredAction(dealId);
                  if ("error" in r) setError(r.error);
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-danger px-3 text-sm font-bold text-on-accent"
            >
              <Ban className="size-4" aria-hidden /> Confirmar encerramento
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-sm text-muted hover:text-text">Cancelar</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={trigger}>
            <Ban className="size-4" aria-hidden /> Encerrar oferta
          </button>
        )
      ) : null}
      {error ? <span className="text-sm text-danger" role="alert">{error}</span> : null}
    </div>
  );
}

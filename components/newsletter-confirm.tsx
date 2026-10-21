"use client";
import Link from "next/link";
import { useActionState } from "react";
import { confirmAction, unsubscribeAction, type NewsletterState } from "@/app/actions/newsletter";

/** Botão de confirmar ou cancelar a inscrição (a mudança só acontece no clique). */
export function NewsletterConfirm({ token, mode }: { token: string; mode: "confirm" | "unsubscribe" }) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(mode === "confirm" ? confirmAction : unsubscribeAction, undefined);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="font-bold">{mode === "confirm" ? "Inscrição confirmada. Você recebe o boletim toda segunda-feira." : "Pronto, você não recebe mais o boletim."}</p>
        <Link href="/" className="font-bold text-accent">Voltar às ofertas</Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="t" value={token} />
      <button type="submit" disabled={pending} className="h-11 w-fit rounded-pill bg-accent px-6 text-sm font-bold text-on-accent hover:bg-accent-hover disabled:opacity-50">
        {mode === "confirm" ? "Confirmar inscrição" : "Cancelar inscrição"}
      </button>
      {state?.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
"use client";
import { useActionState } from "react";
import { subscribeAction, type NewsletterState } from "@/app/actions/newsletter";

/** Inscrição no boletim, no rodapé. O campo "website" é uma isca para robôs e fica fora da tela. */
export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeAction, undefined);
  if (state?.ok) {
    return <p role="status" className="text-sm font-bold text-price">Quase lá! Enviamos um e-mail para você confirmar a inscrição.</p>;
  }
  return (
    <form action={action} className="flex max-w-md flex-col gap-2" aria-labelledby="nl-title">
      <p id="nl-title" className="font-bold text-text">As ofertas mais quentes da semana, no seu e-mail</p>
      <div className="flex gap-2">
        <label htmlFor="nl-email" className="sr-only">Seu e-mail</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="seu@email.com" className="h-10 min-w-0 flex-1 rounded-pill border border-border-input bg-bg px-4 text-sm text-text" />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-0 opacity-0" />
        <button type="submit" disabled={pending} className="h-10 rounded-pill bg-accent px-5 text-sm font-bold text-on-accent hover:bg-accent-hover disabled:opacity-50">
          {pending ? "Enviando…" : "Quero receber"}
        </button>
      </div>
      <p role="status" className="min-h-5 text-xs text-danger">{state?.error ?? ""}</p>
    </form>
  );
}
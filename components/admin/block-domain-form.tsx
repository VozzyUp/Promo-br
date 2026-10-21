"use client";
import { useActionState } from "react";
import { blockDomainAction, type AdminState } from "@/app/actions/admin";

const input = "h-10 rounded-sm border border-border-input bg-bg px-2 text-sm";

export function BlockDomainForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(blockDomainAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-2 md:flex-row md:items-end">
      <div className="flex-1">
        <label htmlFor="bd-domain" className="mb-1 block text-sm font-bold">Domínio</label>
        <input id="bd-domain" name="domain" required placeholder="golpe.com" className={`${input} w-full`} />
      </div>
      <div className="flex-[2]">
        <label htmlFor="bd-reason" className="mb-1 block text-sm font-bold">Motivo</label>
        <input id="bd-reason" name="reason" required maxLength={200} placeholder="Ex.: loja falsa, phishing" className={`${input} w-full`} />
      </div>
      <button type="submit" disabled={pending} className="h-10 rounded-pill bg-danger px-5 text-sm font-bold text-on-accent disabled:opacity-50">
        {pending ? "Bloqueando…" : "Bloquear"}
      </button>
      <p role="status" className={`text-sm ${state?.error ? "text-danger" : "text-muted"}`}>{state?.error ?? (state?.ok ? "Bloqueado." : "")}</p>
    </form>
  );
}

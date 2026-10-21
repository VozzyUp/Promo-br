"use client";
import { useActionState } from "react";
import { useKeepForm } from "./use-keep-form";
import { editDealAction, type DealEditState } from "@/app/actions/staff";

const input = "h-10 w-full rounded-sm border border-border-input bg-bg px-2 text-sm";

export function DealEditForm({ id, title, categoryId, ean, categories }: { id: string; title: string; categoryId: string | null; ean: string | null; categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<DealEditState, FormData>(editDealAction, undefined);
  const submit = useKeepForm(action);
  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_14rem_11rem_auto] md:items-end">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor={`t-${id}`} className="mb-1 block text-sm font-bold">Título</label>
        <input id={`t-${id}`} name="title" defaultValue={title} maxLength={140} required className={input} />
      </div>
      <div>
        <label htmlFor={`c-${id}`} className="mb-1 block text-sm font-bold">Categoria</label>
        <select id={`c-${id}`} name="categoryId" defaultValue={categoryId ?? ""} className={input}>
          <option value="">Sem categoria</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`e-${id}`} className="mb-1 block text-sm font-bold">Código de barras</label>
        <input id={`e-${id}`} name="ean" defaultValue={ean ?? ""} inputMode="numeric" maxLength={20} placeholder="EAN, só números" className={input} />
      </div>
      <button type="submit" disabled={pending} className="h-10 rounded-pill bg-accent px-5 text-sm font-bold text-on-accent disabled:opacity-50">{pending ? "Salvando…" : "Salvar"}</button>
      <p role="status" className={`text-sm md:col-span-4 ${state?.error ? "text-danger" : "text-muted"}`}>{state?.error ?? (state?.ok ? "Salvo." : "")}</p>
    </form>
  );
}
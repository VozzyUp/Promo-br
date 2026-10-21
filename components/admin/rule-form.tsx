"use client";
import { useActionState } from "react";
import { saveRuleAction, type RuleState } from "@/app/actions/robot";

const input = "h-10 w-full rounded-sm border border-border-input bg-bg px-2 text-sm";

export type RuleValues = {
  id?: string; name: string; cron: string; keywords: string; minDiscountPct: number; minCommissionPct: number;
  maxPrice: string; perRun: number; active: boolean; autoPublish: boolean; categoryId: string;
};

export const NEW_RULE: RuleValues = {
  name: "", cron: "0 8,13,19 * * *", keywords: "", minDiscountPct: 15, minCommissionPct: 0, maxPrice: "", perRun: 20,
  active: false, autoPublish: false, categoryId: "",
};

export function RuleForm({ rule, categories }: { rule: RuleValues; categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<RuleState, FormData>(saveRuleAction, undefined);
  const k = rule.id ?? "new";
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {rule.id ? <input type="hidden" name="id" value={rule.id} /> : null}
      <div><label htmlFor={`n-${k}`} className="mb-1 block text-sm font-bold">Nome</label><input id={`n-${k}`} name="name" defaultValue={rule.name} required className={input} /></div>
      <div><label htmlFor={`c-${k}`} className="mb-1 block text-sm font-bold">Horários (cron, horário de Brasília)</label><input id={`c-${k}`} name="cron" defaultValue={rule.cron} required className={input} /></div>
      <div className="md:col-span-2">
        <label htmlFor={`k-${k}`} className="mb-1 block text-sm font-bold">Palavras-chave (uma por linha, até 6; vazio = mais vendidos)</label>
        <textarea id={`k-${k}`} name="keywords" defaultValue={rule.keywords} rows={3} className="w-full rounded-sm border border-border-input bg-bg p-2 text-sm" />
      </div>
      <div><label htmlFor={`d-${k}`} className="mb-1 block text-sm font-bold">Desconto mínimo (%)</label><input id={`d-${k}`} name="minDiscountPct" type="number" min={0} max={95} step="1" defaultValue={rule.minDiscountPct} className={input} /></div>
      <div><label htmlFor={`m-${k}`} className="mb-1 block text-sm font-bold">Comissão mínima (%)</label><input id={`m-${k}`} name="minCommissionPct" type="number" min={0} max={100} step="0.5" defaultValue={rule.minCommissionPct} className={input} /></div>
      <div><label htmlFor={`p-${k}`} className="mb-1 block text-sm font-bold">Preço máximo (R$, vazio = sem limite)</label><input id={`p-${k}`} name="maxPrice" defaultValue={rule.maxPrice} className={input} /></div>
      <div><label htmlFor={`r-${k}`} className="mb-1 block text-sm font-bold">Ofertas por rodada</label><input id={`r-${k}`} name="perRun" type="number" min={1} max={50} defaultValue={rule.perRun} className={input} /></div>
      <div>
        <label htmlFor={`g-${k}`} className="mb-1 block text-sm font-bold">Categoria das ofertas</label>
        <select id={`g-${k}`} name="categoryId" defaultValue={rule.categoryId} className={input}>
          <option value="">Sem categoria</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={rule.active} className="size-4" /> Ligada</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="autoPublish" defaultChecked={rule.autoPublish} className="size-4" /> Publicar direto (sem fila)</label>
      </div>
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className="h-10 rounded-pill bg-accent px-5 text-sm font-bold text-on-accent disabled:opacity-50">{pending ? "Salvando…" : rule.id ? "Salvar regra" : "Criar regra"}</button>
        <p role="status" className={`text-sm ${state?.error ? "text-danger" : "text-muted"}`}>{state?.error ?? (state?.ok ? "Salvo." : "")}</p>
      </div>
    </form>
  );
}
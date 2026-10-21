"use client";
import { useActionState } from "react";
import { useKeepForm } from "./use-keep-form";
import { saveAdsAction, saveBrandAction, saveLegalAction, saveRankingAction, type SettingState } from "@/app/actions/settings-admin";
import type { AdsSettings, BfSettings, BrandSettings } from "@/lib/data/settings";
import { WEIGHT_FIELDS, type RankWeights } from "@/lib/ranking";

const input = "h-10 w-full rounded-sm border border-border-input bg-bg px-2 text-sm";
const submit = "h-10 rounded-pill bg-accent px-5 text-sm font-bold text-on-accent disabled:opacity-50";

function Status({ s }: { s: SettingState }) {
  return <p role="status" className={`text-sm ${s?.error ? "text-danger" : "text-muted"}`}>{s?.error ?? (s?.ok ? "Salvo." : "")}</p>;
}

export function BrandForm({ brand, bf }: { brand: BrandSettings; bf: BfSettings }) {
  const [state, action, pending] = useActionState<SettingState, FormData>(saveBrandAction, undefined);
  const onSubmit = useKeepForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-card bg-bg p-4 shadow-card">
      <h2 className="text-title font-bold">Nome e descrição</h2>
      <div><label htmlFor="b-name" className="mb-1 block text-sm font-bold">Nome do site</label><input id="b-name" name="siteName" defaultValue={brand.siteName} className={input} /></div>
      <div><label htmlFor="b-desc" className="mb-1 block text-sm font-bold">Descrição padrão (aparece no Google)</label><input id="b-desc" name="description" defaultValue={brand.description} className={input} /></div>
      <div><label htmlFor="b-com" className="mb-1 block text-sm font-bold">Aviso de comissão no rodapé</label><input id="b-com" name="commissionNotice" defaultValue={brand.commissionNotice} className={input} /></div>
      <h2 className="mt-2 text-title font-bold">Faixa de campanha (Black Friday)</h2>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="bfEnabled" defaultChecked={bf.enabled} className="size-4" /> Mostrar a faixa no topo do site</label>
      <div><label htmlFor="bf-t" className="mb-1 block text-sm font-bold">Título</label><input id="bf-t" name="bfTitle" defaultValue={bf.title} className={input} /></div>
      <div><label htmlFor="bf-x" className="mb-1 block text-sm font-bold">Texto</label><input id="bf-x" name="bfText" defaultValue={bf.text} className={input} /></div>
      <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={submit}>{pending ? "Salvando…" : "Salvar"}</button><Status s={state} /></div>
    </form>
  );
}

export function AdsForm({ ads, fromEnv }: { ads: AdsSettings; fromEnv: boolean }) {
  const [state, action, pending] = useActionState<SettingState, FormData>(saveAdsAction, undefined);
  const onSubmit = useKeepForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-card bg-bg p-4 shadow-card">
      <h2 className="text-title font-bold">Google AdSense</h2>
      <p className="text-sm text-muted">
        Os anúncios só aparecem para quem aceitou os cookies. Deixe vazio para não exibir anúncios. {fromEnv ? "Hoje os valores abaixo vêm das variáveis do servidor; ao salvar aqui, o painel passa a mandar." : ""}
      </p>
      <div><label htmlFor="a-client" className="mb-1 block text-sm font-bold">ID do editor</label><input id="a-client" name="client" defaultValue={ads.client} placeholder="ca-pub-0000000000000000" className={input} /></div>
      <div><label htmlFor="a-slot" className="mb-1 block text-sm font-bold">ID do bloco de anúncio</label><input id="a-slot" name="slot" defaultValue={ads.slot} placeholder="1234567890" className={input} /></div>
      <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={submit}>{pending ? "Salvando…" : "Salvar"}</button><Status s={state} /></div>
    </form>
  );
}

export function RankingForm({ weights }: { weights: RankWeights }) {
  const [state, action, pending] = useActionState<SettingState, FormData>(saveRankingAction, undefined);
  const onSubmit = useKeepForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-card bg-bg p-4 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        {WEIGHT_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`r-${f.key}`} className="mb-1 block text-sm font-bold">{f.label}</label>
            <input id={`r-${f.key}`} name={f.key} inputMode="decimal" defaultValue={String(weights[f.key]).replace(".", ",")} className={input} />
            <p className="mt-1 text-xs text-muted">{f.help} Entre {f.min} e {f.max}.</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={submit}>{pending ? "Salvando…" : "Salvar pesos"}</button>
        <button type="submit" name="intent" value="reset" disabled={pending} className="h-10 rounded-pill border border-border px-5 text-sm font-bold disabled:opacity-50">Voltar ao padrão</button>
        <Status s={state} />
      </div>
    </form>
  );
}

export function LegalForm({ slug, title, body, custom }: { slug: string; title: string; body: string; custom: boolean }) {
  const [state, action, pending] = useActionState<SettingState, FormData>(saveLegalAction, undefined);
  const onSubmit = useKeepForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor={`l-${slug}`} className="text-sm font-bold">Texto de “{title}”</label>
      <textarea id={`l-${slug}`} name="body" defaultValue={body} rows={16} className="w-full rounded-sm border border-border-input bg-bg p-2 font-mono text-sm" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" name="intent" value="save" disabled={pending} className={submit}>{pending ? "Salvando…" : "Salvar"}</button>
        {custom ? <button type="submit" name="intent" value="reset" disabled={pending} className="h-10 rounded-pill border border-border px-4 text-sm font-bold">Voltar ao texto padrão</button> : null}
        <Status s={state} />
      </div>
    </form>
  );
}
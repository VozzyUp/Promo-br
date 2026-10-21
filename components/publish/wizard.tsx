"use client";

import { ArrowDown, ArrowUp, Check, ImagePlus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { checkLinkAction, publishAction, type LinkCheckResult } from "@/app/actions/publish";
import { RichEditor } from "@/components/forms/rich-editor";
import { AiSuggest } from "@/components/publish/ai-suggest";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { discountPercent, parsePriceToCents } from "@/lib/format";

type Kind = "deal" | "coupon";
type Values = {
  url: string; availability: "online" | "offline"; title: string; price: string; listPrice: string; shipping: string;
  shipsFrom: string; categoryId: string; couponCode: string; couponKind: string; couponValue: string;
  startsAt: string; expiresAt: string; description: string; previewImageUrl: string;
};
/** Em qual passo fica cada campo que o servidor pode recusar. */
const STEP_OF_FIELD: Record<string, number> = {
  url: 0, title: 1, couponKind: 1, couponValue: 1, couponCode: 1, price: 1, listPrice: 1, shipping: 1, categoryId: 1,
  images: 2, description: 3, startsAt: 4, expiresAt: 4,
};

type Picked = { id: number; file: File; src: string };

const EMPTY: Values = {
  url: "", availability: "online", title: "", price: "", listPrice: "", shipping: "", shipsFrom: "", categoryId: "",
  couponCode: "", couponKind: "", couponValue: "", startsAt: "", expiresAt: "", description: "", previewImageUrl: "",
};
const STEPS = ["Link", "Essenciais", "Imagens", "Descrição", "Detalhes", "Revisão"] as const;
const COUPON_KINDS = [
  { id: "percent", label: "Porcentagem (ex.: 15% de desconto)" },
  { id: "amount", label: "Valor fixo (ex.: R$ 30 de desconto)" },
  { id: "free_shipping", label: "Frete grátis" },
  { id: "other", label: "Outro tipo" },
] as const;

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PublishWizard({ kind, categories, trusted, aiEnabled = false }: { kind: Kind; categories: { id: string; name: string }[]; trusted: boolean; aiEnabled?: boolean }) {
  const isCoupon = kind === "coupon";
  const draftKey = `promo-br:draft:${kind}`;
  const maxImages = isCoupon ? 6 : 8;
  const [state, formAction, publishing] = useActionState(publishAction, undefined);
  const [checking, startCheck] = useTransition();
  const [, startPublish] = useTransition();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>(EMPTY);
  const [lc, setLc] = useState<LinkCheckResult | null>(null);
  const [imgs, setImgs] = useState<Picked[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const nextId = useRef(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const fe = state?.fieldErrors ?? {};

  // Rascunho: só os campos de texto, neste aparelho.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o rascunho depois da hidratação
      if (saved) setV({ ...EMPTY, ...(JSON.parse(saved) as Partial<Values>) });
    } catch {
      /* sem armazenamento: segue sem rascunho */
    }
    setDraftReady(true);
  }, [draftKey]);
  useEffect(() => {
    if (!draftReady) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(v));
    } catch {
      /* ignora */
    }
  }, [v, draftKey, draftReady]);
  useEffect(() => () => imgs.forEach((i) => URL.revokeObjectURL(i.src)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando o servidor recusa, leva a pessoa ao primeiro passo que tem campo marcado (o erro pode estar num passo que ela não está vendo).
  useEffect(() => {
    const keys = Object.keys(state?.fieldErrors ?? {});
    if (keys.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reação a uma resposta do servidor
    setStep(Math.min(...keys.map((k) => STEP_OF_FIELD[k] ?? 5)));
  }, [state]);

  const [bump, setDraftKeyBump] = useState(0);
  const aiInput = () => ({
    title: v.title, description: v.description, store: lc && lc.ok ? (lc.storeName ?? "") : "", price: v.price, listPrice: v.listPrice,
    couponCode: v.couponCode, couponKind: v.couponKind, couponValue: v.couponValue,
  });
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

  const priceCents = v.price ? parsePriceToCents(v.price) : null;
  const listCents = v.listPrice ? parsePriceToCents(v.listPrice) : null;
  const pct = priceCents != null ? discountPercent(priceCents, listCents) : null;
  const duplicate = lc && lc.ok ? lc.duplicate : null;
  const needsLink = v.availability === "online";

  function verifyLink() {
    setStepError(null);
    startCheck(async () => {
      const r = await checkLinkAction(v.url);
      setLc(r);
      if (!r.ok) return;
      setV((p) => ({
        ...p,
        title: p.title || r.preview?.title || "",
        price: p.price || (r.preview?.priceCents != null ? (r.preview.priceCents / 100).toFixed(2).replace(".", ",") : ""),
        previewImageUrl: r.preview?.imageUrl ?? "",
      }));
    });
  }

  function validateStep(i: number): string | null {
    if (i === 0) {
      if (needsLink && !v.url.trim()) return "Cole o link da oferta.";
      if (v.url.trim() && !lc) return "Toque em “Verificar link” antes de continuar.";
      if (lc && !lc.ok) return lc.error;
      if (duplicate) return "Essa oferta já foi publicada. Comente nela ou procure outra.";
    }
    if (i === 1) {
      if (v.title.trim().length < 10) return "O título precisa ter pelo menos 10 caracteres.";
      if (!isCoupon && priceCents == null) return "Informe o preço.";
      if (priceCents != null && listCents != null && listCents <= priceCents) return "O preço anterior precisa ser maior que o atual.";
      if (isCoupon && !v.couponKind) return "Escolha o tipo de desconto.";
      if (isCoupon && v.couponKind !== "free_shipping" && !v.couponCode.trim()) return "Informe o código do cupom.";
      if (isCoupon && (v.couponKind === "percent" || v.couponKind === "amount") && !v.couponValue.trim()) return "Informe o valor do desconto.";
      if (!v.categoryId) return "Escolha uma categoria.";
    }
    return null;
  }

  function go(to: number) {
    if (to > step) {
      for (let i = step; i < to; i++) {
        const err = validateStep(i);
        if (err) {
          setStepError(err);
          setStep(i);
          return;
        }
      }
    }
    setStepError(null);
    setStep(to);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setImgError(null);
    const room = maxImages - imgs.length;
    const picked = [...list].slice(0, Math.max(room, 0));
    if (list.length > room) setImgError(`No máximo ${maxImages} imagens.`);
    const ok = picked.filter((f) => {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        setImgError(`${f.name}: use JPG, PNG ou WebP.`);
        return false;
      }
      if (f.size > 3 * 1024 * 1024) {
        setImgError(`${f.name}: passa de 3 MB.`);
        return false;
      }
      return true;
    });
    setImgs((p) => [...p, ...ok.map((file) => ({ id: nextId.current++, file, src: URL.createObjectURL(file) }))]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function moveImg(i: number, d: -1 | 1) {
    setImgs((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const c = [...p];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }
  function removeImg(id: number) {
    setImgs((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.src);
      return p.filter((x) => x.id !== id);
    });
  }

  function submit() {
    const err = validateStep(0) ?? validateStep(1);
    if (err) {
      setStepError(err);
      return;
    }
    const fd = new FormData();
    fd.set("kind", kind);
    for (const [k, val] of Object.entries(v)) fd.set(k, val);
    imgs.forEach((i) => fd.append("images", i.file));
    startPublish(() => formAction(fd));
  }

  const categoryName = useMemo(() => categories.find((c) => c.id === v.categoryId)?.name ?? "", [categories, v.categoryId]);

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Passos">
        {STEPS.map((label, i) => (
          <li key={label} className="shrink-0">
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
              className={`flex h-9 items-center gap-1.5 rounded-pill px-3 text-sm ${i === step ? "bg-accent font-bold text-on-accent" : "text-muted hover:bg-surface"}`}
            >
              {i < step ? <Check className="size-4" aria-hidden /> : <span aria-hidden>{i + 1}</span>}
              {label}
            </button>
          </li>
        ))}
      </ol>

      {!trusted ? (
        <FormMessage tone="info">Suas primeiras publicações passam pela moderação. Depois de 3 aprovadas, saem na hora.</FormMessage>
      ) : null}
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      {stepError ? <FormMessage>{stepError}</FormMessage> : null}

      {/* 1. Link */}
      <section hidden={step !== 0} className="flex flex-col gap-4" aria-label="Link">
        <fieldset className="flex gap-4">
          <legend className="mb-1 text-sm font-bold">Onde vale?</legend>
          {(["online", "offline"] as const).map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="radio" name="availability-ui" checked={v.availability === a} onChange={() => set("availability", a)} />
              {a === "online" ? "Online" : "Loja física"}
            </label>
          ))}
        </fieldset>
        <Field label={needsLink ? "Link da oferta" : "Link (opcional)"} htmlFor="w-url" error={fe.url}
          hint="Pode ser o seu link de afiliado: ele é mantido como você colar.">
          <div className="flex gap-2">
            <Input id="w-url" type="url" inputMode="url" placeholder="https://" value={v.url} aria-invalid={!!fe.url}
              onChange={(e) => { set("url", e.target.value); setLc(null); }} />
            <Button type="button" variant="secondary" loading={checking} onClick={verifyLink} disabled={!v.url.trim()}>Verificar link</Button>
          </div>
        </Field>
        {lc && !lc.ok ? <FormMessage>{lc.error}</FormMessage> : null}
        {lc && lc.ok ? (
          <div className="rounded-card border border-border p-3 text-sm">
            <p className="font-bold">{lc.storeName ?? lc.host}{lc.storeName ? "" : " (loja nova, entra em análise)"}</p>
            {lc.preview?.title ? <p className="text-muted">Encontramos: {lc.preview.title}</p> : <p className="text-muted">Não conseguimos ler os dados da página. Preencha você mesmo nos próximos passos.</p>}
            {duplicate ? (
              <p className="mt-2 text-danger" role="alert">
                Essa oferta já foi publicada:{" "}
                <Link href={`/oferta/${duplicate.slug}`} className="font-bold underline">{duplicate.title}</Link>
              </p>
            ) : (
              <p className="mt-1 text-success">Nenhuma oferta repetida encontrada.</p>
            )}
          </div>
        ) : null}
        {!needsLink ? (
          <Field label="Cidade ou loja" htmlFor="w-place" hint="Onde a pessoa encontra a oferta. Ex.: Carrefour da Av. Paulista, São Paulo">
            <Input id="w-place" maxLength={60} value={v.shipsFrom} onChange={(e) => set("shipsFrom", e.target.value)} />
          </Field>
        ) : null}
      </section>

      {/* 2. Essenciais */}
      <section hidden={step !== 1} className="flex flex-col gap-4" aria-label="Essenciais">
        <Field label="Título" htmlFor="w-title" error={fe.title} hint="Produto e principal detalhe. Ex.: Fone Bluetooth com cancelamento de ruído">
          <Input id="w-title" maxLength={140} value={v.title} aria-invalid={!!fe.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        {aiEnabled ? <AiSuggest field="title" getInput={aiInput} onUse={(t) => set("title", t.slice(0, 140))} /> : null}
        {isCoupon ? (
          <>
            <Field label="Tipo de desconto" htmlFor="w-ckind" error={fe.couponKind}>
              <Select id="w-ckind" value={v.couponKind} onChange={(e) => set("couponKind", e.target.value)}>
                <option value="" disabled>Escolha</option>
                {COUPON_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </Select>
            </Field>
            {v.couponKind === "percent" || v.couponKind === "amount" ? (
              <Field label={v.couponKind === "percent" ? "Porcentagem (%)" : "Valor do desconto (R$)"} htmlFor="w-cval" error={fe.couponValue}>
                <Input id="w-cval" inputMode="decimal" value={v.couponValue} onChange={(e) => set("couponValue", e.target.value)} />
              </Field>
            ) : null}
            <Field label={v.couponKind === "free_shipping" ? "Código do cupom (se houver)" : "Código do cupom"} htmlFor="w-code" error={fe.couponCode}>
              <Input id="w-code" maxLength={40} value={v.couponCode} className="font-mono uppercase" onChange={(e) => set("couponCode", e.target.value)} />
            </Field>
          </>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={isCoupon ? "Preço do produto (opcional)" : "Preço (R$)"} htmlFor="w-price" error={fe.price}>
            <Input id="w-price" inputMode="decimal" placeholder="199,90" value={v.price} onChange={(e) => set("price", e.target.value)} />
          </Field>
          <Field label="Preço anterior (opcional)" htmlFor="w-list" error={fe.listPrice}
            hint={pct != null ? `Desconto de ${pct}%` : undefined}>
            <Input id="w-list" inputMode="decimal" placeholder="399,90" value={v.listPrice} onChange={(e) => set("listPrice", e.target.value)} />
          </Field>
        </div>
        {needsLink && !isCoupon ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frete (R$, 0 = grátis)" htmlFor="w-ship" error={fe.shipping}>
              <Input id="w-ship" inputMode="decimal" placeholder="0" value={v.shipping} onChange={(e) => set("shipping", e.target.value)} />
            </Field>
            <Field label="Enviado de (opcional)" htmlFor="w-from" hint="Cidade ou país de origem">
              <Input id="w-from" maxLength={60} value={v.shipsFrom} onChange={(e) => set("shipsFrom", e.target.value)} />
            </Field>
          </div>
        ) : null}
        <Field label="Categoria" htmlFor="w-cat" error={fe.categoryId}>
          <Select id="w-cat" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={!!fe.categoryId}>
            <option value="">Escolha uma categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </section>

      {/* 3. Imagens */}
      <section hidden={step !== 2} className="flex flex-col gap-3" aria-label="Imagens">
        <p className="text-sm text-muted">
          Até {maxImages} imagens (JPG, PNG ou WebP, de 3 MB no máximo). A primeira é a principal.
          {v.previewImageUrl && imgs.length === 0 ? " Se você não enviar nenhuma, usamos a imagem da página do link." : ""}
        </p>
        <div>
          <input ref={fileRef} id="w-files" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
            onChange={(e) => addFiles(e.target.files)} />
          <label htmlFor="w-files" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-accent px-4 text-sm font-bold text-accent hover:bg-accent-soft">
            <ImagePlus className="size-4" aria-hidden /> Escolher imagens
          </label>
        </div>
        {imgError || fe.images ? <p className="text-sm text-danger" role="alert">{imgError ?? fe.images}</p> : null}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {imgs.map((im, i) => (
            <li key={im.id} className="flex flex-col gap-1 rounded-card border border-border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob:) */}
              <img src={im.src} alt={`Imagem ${i + 1} escolhida`} className="aspect-square w-full rounded-sm object-cover" />
              <div className="flex items-center justify-between">
                {i === 0 ? <span className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star className="size-3" aria-hidden />Principal</span> : <span className="text-xs text-muted">{i + 1}</span>}
                <span className="flex">
                  <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} aria-label="Mover para antes" className="grid size-7 place-items-center rounded-sm text-muted hover:bg-surface disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
                  <button type="button" onClick={() => moveImg(i, 1)} disabled={i === imgs.length - 1} aria-label="Mover para depois" className="grid size-7 place-items-center rounded-sm text-muted hover:bg-surface disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
                  <button type="button" onClick={() => removeImg(im.id)} aria-label="Remover imagem" className="grid size-7 place-items-center rounded-sm text-danger hover:bg-surface"><Trash2 className="size-4" aria-hidden /></button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Descrição */}
      <section hidden={step !== 3} className="flex flex-col gap-1.5" aria-label="Descrição">
        <span className="text-sm font-bold">Descrição (opcional)</span>
        <p className="text-sm text-muted">Como aplicar o cupom, formas de pagamento, estoque, avisos...</p>
        {aiEnabled ? <AiSuggest field="description" getInput={aiInput} onUse={(t) => { set("description", t.slice(0, 5000)); setDraftKeyBump((n) => n + 1); }} /> : null}
        {draftReady ? (
          <RichEditor key={`${draftKey}:${bump}`} name="description-ui" label="Descrição" max={5000} defaultValue={v.description} rows={8}
            onChange={(val) => set("description", val)} invalid={!!fe.description} />
        ) : null}
      </section>

      {/* 5. Detalhes */}
      <section hidden={step !== 4} className="flex flex-col gap-4" aria-label="Detalhes">
        <p className="text-sm text-muted">Horário de Brasília. Deixe em branco se a oferta vale a partir de agora e sem prazo definido.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Começa em (opcional)" htmlFor="w-start" error={fe.startsAt}>
            <Input id="w-start" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label="Termina em (opcional)" htmlFor="w-end" error={fe.expiresAt}>
            <Input id="w-end" type="datetime-local" value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* 6. Revisão */}
      <section hidden={step !== 5} className="flex flex-col gap-3" aria-label="Revisão">
        <h2 className="text-lg font-bold">Confira antes de publicar</h2>
        <dl className="grid gap-x-4 gap-y-2 rounded-card border border-border p-4 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">Tipo</dt><dd>{isCoupon ? "Cupom" : "Oferta"}, {v.availability === "online" ? "online" : "loja física"}</dd>
          <dt className="text-muted">Título</dt><dd className="font-bold">{v.title || "—"}</dd>
          {priceCents != null ? (<><dt className="text-muted">Preço</dt><dd>{brl(priceCents)}{listCents ? ` (antes ${brl(listCents)}${pct != null ? `, ${pct}% de desconto` : ""})` : ""}</dd></>) : null}
          {isCoupon ? (<><dt className="text-muted">Cupom</dt><dd>{COUPON_KINDS.find((k) => k.id === v.couponKind)?.label ?? "—"}{v.couponValue ? ` · ${v.couponValue}` : ""}{v.couponCode ? ` · ${v.couponCode.toUpperCase()}` : ""}</dd></>) : null}
          <dt className="text-muted">Categoria</dt><dd>{categoryName || "—"}</dd>
          {v.url ? (<><dt className="text-muted">Link</dt><dd className="break-all">{v.url}</dd></>) : null}
          <dt className="text-muted">Imagens</dt><dd>{imgs.length > 0 ? `${imgs.length} escolhida(s)` : v.previewImageUrl ? "Imagem da página do link" : "Nenhuma"}</dd>
          {v.startsAt || v.expiresAt ? (<><dt className="text-muted">Período</dt><dd>{v.startsAt || "agora"} até {v.expiresAt || "sem prazo"}</dd></>) : null}
        </dl>
        <p className="text-sm text-muted">Comparamos o preço com o histórico do produto. Desconto inflado, com o preço “de” aumentado, não é publicado.</p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => go(Math.max(step - 1, 0))} disabled={step === 0}>Voltar</Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => go(step + 1)}>Continuar</Button>
        ) : (
          <Button type="button" size="lg" loading={publishing} onClick={submit}>{isCoupon ? "Publicar cupom" : "Publicar oferta"}</Button>
        )}
      </div>
    </div>
  );
}

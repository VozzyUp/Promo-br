"use client";

import { useActionState } from "react";
import { submitDealAction } from "@/app/actions/deal";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import type { Category } from "@/lib/types";

export function DealForm({ categories, trusted }: { categories: Category[]; trusted: boolean }) {
  const [state, action, pending] = useActionState(submitDealAction, undefined);
  const v = state?.values ?? {};
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      {!trusted ? (
        <FormMessage tone="info">
          Suas primeiras ofertas passam pela moderação antes de aparecer. Depois de 3 aprovadas, elas saem na hora.
        </FormMessage>
      ) : null}

      <Field label="Link da oferta" htmlFor="url" error={e.url}
        hint="Pode usar o seu link de afiliado: ele é mantido como você colar.">
        <Input id="url" name="url" type="url" inputMode="url" placeholder="https://" required defaultValue={v.url}
          aria-invalid={!!e.url} aria-describedby="url-hint" />
      </Field>

      <Field label="Título" htmlFor="title" error={e.title} hint="Diga o produto e o principal detalhe. Ex.: Fone Bluetooth com cancelamento de ruído">
        <Input id="title" name="title" required minLength={10} maxLength={140} defaultValue={v.title} aria-invalid={!!e.title} aria-describedby="title-hint" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Preço (R$)" htmlFor="price" error={e.price}>
          <Input id="price" name="price" inputMode="decimal" placeholder="199,90" defaultValue={v.price} aria-invalid={!!e.price} />
        </Field>
        <Field label="Preço anterior (opcional)" htmlFor="listPrice" error={e.listPrice}>
          <Input id="listPrice" name="listPrice" inputMode="decimal" placeholder="399,90" defaultValue={v.listPrice} aria-invalid={!!e.listPrice} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Código do cupom (opcional)" htmlFor="couponCode" error={e.couponCode}>
          <Input id="couponCode" name="couponCode" autoCapitalize="characters" maxLength={40} defaultValue={v.couponCode} className="font-mono uppercase" />
        </Field>
        <Field label="Categoria" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" defaultValue={v.categoryId ?? ""}>
            <option value="">Escolha uma categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Detalhes (opcional)" htmlFor="description" error={e.description}
        hint="Frete, forma de pagamento, como aplicar o cupom, validade...">
        <Textarea id="description" name="description" maxLength={3000} defaultValue={v.description} aria-describedby="description-hint" />
      </Field>

      <p className="text-sm text-muted">
        Comparamos o preço com o histórico do produto. Desconto inflado (preço &ldquo;de&rdquo; aumentado para parecer promoção) não é publicado.
      </p>
      <Button type="submit" size="lg" loading={pending} className="sm:self-end">Publicar oferta</Button>
    </form>
  );
}

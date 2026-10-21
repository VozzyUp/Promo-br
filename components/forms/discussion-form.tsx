"use client";

import { useActionState } from "react";
import { submitDiscussionAction } from "@/app/actions/discussion";
import { RichEditor } from "@/components/forms/rich-editor";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { DISCUSSION_KINDS } from "@/lib/discussions";

export function DiscussionForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(submitDiscussionAction, undefined);
  const v = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <Field label="Título" htmlFor="title" error={fe.title} hint="Diga em uma frase do que se trata.">
        <Input id="title" name="title" required maxLength={140} defaultValue={v.title} aria-invalid={!!fe.title} aria-describedby="title-hint" />
      </Field>
      <Field label="Tipo de discussão" htmlFor="kind" error={fe.kind}>
        <Select id="kind" name="kind" required defaultValue={v.kind ?? ""} aria-invalid={!!fe.kind}>
          <option value="" disabled>Escolha um tipo</option>
          {DISCUSSION_KINDS.map((k) => (
            <option key={k.id} value={k.id}>{k.label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Categoria relacionada (opcional)" htmlFor="categoryId">
        <Select id="categoryId" name="categoryId" defaultValue={v.categoryId ?? ""}>
          <option value="">Nenhuma</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Descrição (opcional)</span>
        <RichEditor name="body" label="Descrição da discussão" max={5000} defaultValue={v.body ?? ""} rows={8} invalid={!!fe.body} placeholder="Dicas, dúvidas, notícias ou reclamações: pode postar de (quase) tudo." />
        {fe.body ? <p className="text-sm text-danger" role="alert">{fe.body}</p> : null}
      </div>
      <Button type="submit" size="lg" loading={pending}>Publicar discussão</Button>
    </form>
  );
}

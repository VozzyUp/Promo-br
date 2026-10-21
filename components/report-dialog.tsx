"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { reportAction } from "@/app/actions/comment";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export type ReportKind = { value: string; label: string };

type Props = {
  target: "deal" | "comment";
  id: string;
  kinds: ReportKind[];
  title: string;
  description: string;
  loggedIn: boolean;
  triggerClassName?: string;
  children: ReactNode;
};

export function ReportDialog({ target, id, kinds, title, description, loggedIn, triggerClassName = "", children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(kinds[0].value);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!loggedIn) {
    return (
      <button type="button" onClick={() => router.push(`/entrar?next=${encodeURIComponent(pathname)}`)} className={triggerClassName}>
        {children}
      </button>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await reportAction({ target, id, kind, note });
      setResult("error" in r ? { ok: false, text: r.error } : { ok: true, text: r.message });
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setResult(null);
          setNote("");
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className={triggerClassName}>{children}</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-bg p-6 shadow-card-hover">
          <Dialog.Close asChild>
            <button type="button" aria-label="Fechar" className="absolute right-3 top-3 grid size-8 place-items-center rounded-pill text-muted hover:bg-surface">
              <X className="size-4" aria-hidden />
            </button>
          </Dialog.Close>
          <Dialog.Title className="pr-8 text-title font-bold">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>

          {result?.ok ? (
            <div className="mt-4 flex flex-col gap-4">
              <FormMessage tone="success">{result.text}</FormMessage>
              <Dialog.Close asChild><Button variant="secondary">Fechar</Button></Dialog.Close>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Motivo</legend>
                {kinds.map((k) => (
                  <label key={k.value} className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                    <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="accent-(--color-accent)" />
                    {k.label}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`note-${id}`} className="text-sm font-bold">Quer explicar? (opcional)</label>
                <textarea
                  id={`note-${id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-sm border border-border-input bg-bg px-3 py-2 text-base"
                />
              </div>
              {result && !result.ok ? <FormMessage>{result.text}</FormMessage> : null}
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild><Button type="button" variant="ghost">Cancelar</Button></Dialog.Close>
                <Button type="submit" loading={pending}>Enviar</Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";
import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { suggestTextAction } from "@/app/actions/ai";
import type { AiField, AiInput } from "@/lib/ai-text";

/** Botão "Sugerir com IA": mostra a sugestão e só aplica se a pessoa clicar em Usar. */
export function AiSuggest({ field, getInput, onUse }: { field: AiField; getInput: () => Omit<AiInput, "field">; onUse: (text: string) => void }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = field === "title" ? "Melhorar o título com IA" : "Escrever a descrição com IA";

  function ask() {
    setError(null);
    setText(null);
    start(async () => {
      const r = await suggestTextAction({ field, ...getInput() });
      if ("error" in r) setError(r.error);
      else setText(r.text);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={ask} disabled={pending} className="flex h-9 w-fit items-center gap-1.5 rounded-pill border border-accent px-4 text-sm font-bold text-accent disabled:opacity-50">
        <Sparkles className="size-4" aria-hidden /> {pending ? "Pensando…" : label}
      </button>
      <div role="status" aria-live="polite">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {text ? (
          <div className="flex flex-col gap-2 rounded-sm bg-accent-soft p-3 text-sm">
            <p className="text-xs font-bold text-accent">Sugestão (confira antes de usar)</p>
            <p className="whitespace-pre-line">{text}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { onUse(text); setText(null); }} className="h-8 rounded-pill bg-accent px-4 text-xs font-bold text-on-accent">Usar</button>
              <button type="button" onClick={() => setText(null)} className="h-8 rounded-pill px-4 text-xs font-bold hover:bg-bg">Descartar</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
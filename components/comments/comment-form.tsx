"use client";

import { AtSign, Bold, Italic, Link2, List, Minus, Strikethrough } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { postCommentAction, type CommentState } from "@/app/actions/comment";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

const MAX = 2000;

const TOOLS = [
  { id: "bold", label: "Negrito", Icon: Bold },
  { id: "italic", label: "Itálico", Icon: Italic },
  { id: "strike", label: "Tachado", Icon: Strikethrough },
  { id: "list", label: "Lista", Icon: List },
  { id: "link", label: "Link", Icon: Link2 },
  { id: "mention", label: "Mencionar alguém", Icon: AtSign },
  { id: "rule", label: "Linha separadora", Icon: Minus },
] as const;

type Props = {
  dealId: string;
  parentId?: string;
  initialText?: string;
  autoFocus?: boolean;
  onDone?: () => void;
  label?: string;
};

export function CommentForm({ dealId, parentId, initialText = "", autoFocus = false, onDone, label = "Escreva seu comentário" }: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [len, setLen] = useState(initialText.length);
  const [state, action, pending] = useActionState<CommentState, FormData>(async (prev, fd) => {
    const result = await postCommentAction(prev, fd);
    if (result?.ok) {
      formRef.current?.reset();
      setLen(0);
      onDone?.();
    }
    return result;
  }, undefined);

  function wrap(before: string, after = before, fallback = "texto") {
    const el = textRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const selected = value.slice(a, b) || fallback;
    el.setRangeText(`${before}${selected}${after}`, a, b, "select");
    el.focus();
    setLen(el.value.length);
  }

  function prefixLines(prefix: string) {
    const el = textRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const start = value.lastIndexOf("\n", a - 1) + 1;
    const block = value.slice(start, b) || "item";
    el.setRangeText(block.split("\n").map((l) => `${prefix}${l}`).join("\n"), start, b, "end");
    el.focus();
    setLen(el.value.length);
  }

  function runTool(tool: (typeof TOOLS)[number]["id"]) {
    if (tool === "bold") wrap("**");
    else if (tool === "italic") wrap("*");
    else if (tool === "strike") wrap("~~");
    else if (tool === "list") prefixLines("- ");
    else if (tool === "link") wrap("[", "](https://)", "texto do link");
    else if (tool === "mention") wrap("@", "", "");
    else wrap("\n---\n", "", "");
  }

  const id = `c-${parentId ?? "novo"}-${dealId}`;
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2" onReset={() => setLen(0)}>
      <input type="hidden" name="dealId" value={dealId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="rounded-sm border border-border-input bg-bg focus-within:border-accent">
        <textarea
          id={id}
          ref={textRef}
          name="body"
          required
          maxLength={MAX}
          rows={3}
          autoFocus={autoFocus}
          defaultValue={initialText}
          placeholder={label}
          onInput={(e) => setLen(e.currentTarget.value.length)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") formRef.current?.requestSubmit();
          }}
          className="block min-h-20 w-full resize-y rounded-sm bg-transparent px-3 py-2 text-base outline-none"
        />
        <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1">
          {TOOLS.map(({ id: toolId, label: l, Icon }) => (
            <button key={toolId} type="button" onClick={() => runTool(toolId)} aria-label={l} title={l} className="grid size-8 place-items-center rounded-sm text-muted hover:bg-surface hover:text-text">
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
          <span className="ml-auto text-xs text-muted" aria-live="polite">{len}/{MAX}</span>
        </div>
      </div>
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Ctrl+Enter envia. Seja gentil: tem gente de verdade lendo.</p>
        <Button type="submit" loading={pending}>Comentar</Button>
      </div>
    </form>
  );
}

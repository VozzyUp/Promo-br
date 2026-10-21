"use client";

import { AtSign, Bold, Italic, Link2, List, Minus, Smile, Strikethrough } from "lucide-react";
import { useRef, useState } from "react";

const TOOLS = [
  { id: "bold", label: "Negrito", Icon: Bold },
  { id: "italic", label: "Itálico", Icon: Italic },
  { id: "strike", label: "Tachado", Icon: Strikethrough },
  { id: "list", label: "Lista", Icon: List },
  { id: "link", label: "Link", Icon: Link2 },
  { id: "mention", label: "Mencionar alguém", Icon: AtSign },
  { id: "rule", label: "Linha separadora", Icon: Minus },
] as const;

const EMOJIS = ["🙂", "😂", "😍", "👍", "🔥", "💸", "🛒", "🎉", "😮", "🤔", "👏", "❤️"];

type Props = {
  name: string;
  label: string;
  max: number;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  /** Avisa a cada mudança (o assistente de publicar guarda o rascunho). */
  onChange?: (value: string) => void;
  invalid?: boolean;
};

/** Caixa de texto com barra de formatação (negrito, lista, link, menção, carinhas). Funciona sem estado externo. */
export function RichEditor({ name, label, max, defaultValue = "", rows = 6, required, placeholder, onChange, invalid }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [len, setLen] = useState(defaultValue.length);
  const [emojiOpen, setEmojiOpen] = useState(false);

  function sync() {
    const el = ref.current;
    if (!el) return;
    setLen(el.value.length);
    onChange?.(el.value);
  }

  function wrap(before: string, after = before, fallback = "texto") {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    el.setRangeText(`${before}${value.slice(a, b) || fallback}${after}`, a, b, "select");
    el.focus();
    sync();
  }

  function prefixLines(prefix: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const start = value.lastIndexOf("\n", a - 1) + 1;
    const block = value.slice(start, b) || "item";
    el.setRangeText(block.split("\n").map((l) => `${prefix}${l}`).join("\n"), start, b, "end");
    el.focus();
    sync();
  }

  function run(tool: (typeof TOOLS)[number]["id"]) {
    if (tool === "bold") wrap("**");
    else if (tool === "italic") wrap("*");
    else if (tool === "strike") wrap("~~");
    else if (tool === "list") prefixLines("- ");
    else if (tool === "link") wrap("[", "](https://)", "texto do link");
    else if (tool === "mention") wrap("@", "", "");
    else wrap("\n---\n", "", "");
  }

  function insertEmoji(e: string) {
    const el = ref.current;
    if (!el) return;
    el.setRangeText(e, el.selectionStart, el.selectionEnd, "end");
    el.focus();
    setEmojiOpen(false);
    sync();
  }

  return (
    <div className={`rounded-sm border bg-bg focus-within:border-accent ${invalid ? "border-danger" : "border-border-input"}`}>
      <label htmlFor={`ed-${name}`} className="sr-only">{label}</label>
      <textarea
        id={`ed-${name}`}
        ref={ref}
        name={name}
        rows={rows}
        maxLength={max}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onInput={sync}
        aria-invalid={invalid || undefined}
        className="block min-h-32 w-full resize-y rounded-sm bg-transparent px-3 py-2 text-base outline-none"
      />
      <div className="relative flex flex-wrap items-center gap-1 border-t border-border px-2 py-1">
        {TOOLS.map(({ id, label: l, Icon }) => (
          <button key={id} type="button" onClick={() => run(id)} aria-label={l} title={l} className="grid size-8 place-items-center rounded-sm text-muted hover:bg-surface hover:text-text">
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
        <button type="button" onClick={() => setEmojiOpen((v) => !v)} aria-expanded={emojiOpen} aria-label="Carinhas" title="Carinhas" className="grid size-8 place-items-center rounded-sm text-muted hover:bg-surface hover:text-text">
          <Smile className="size-4" aria-hidden />
        </button>
        <span className="ml-auto text-xs text-muted" aria-live="polite">{len}/{max}</span>
        {emojiOpen ? (
          <ul className="absolute bottom-full left-2 z-10 mb-1 grid grid-cols-6 gap-1 rounded-card bg-bg p-2 shadow-card-hover" aria-label="Carinhas">
            {EMOJIS.map((e) => (
              <li key={e}>
                <button type="button" onClick={() => insertEmoji(e)} className="grid size-8 place-items-center rounded-sm text-lg hover:bg-surface">{e}</button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

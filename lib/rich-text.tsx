// Texto formatado dos comentários e descrições. Subconjunto de markdown, sem HTML cru:
// o texto vira elementos React (escapados), então não existe caminho para script ou atributo injetado.
import Link from "next/link";
import type { ReactNode } from "react";

const INLINE =
  /\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])|(?<![\w@])@([a-zA-Z0-9_]{3,24})\b/g;

function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function shorten(url: string) {
  const s = url.replace(/^https?:\/\/(www\.)?/, "");
  return s.length > 48 ? `${s.slice(0, 45)}...` : s;
}

function externalLink(href: string, label: ReactNode, key: string) {
  return (
    <a key={key} href={href} target="_blank" rel="nofollow ugc noopener noreferrer" className="break-all font-bold text-accent underline">
      {label}
    </a>
  );
}

function renderInline(text: string, prefix: string, depth = 0): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${prefix}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={key}>{depth < 2 ? renderInline(m[1], key, depth + 1) : m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<s key={key}>{m[2]}</s>);
    else if (m[3] !== undefined) out.push(<em key={key}>{depth < 2 ? renderInline(m[3], key, depth + 1) : m[3]}</em>);
    else if (m[4] !== undefined) {
      const href = safeUrl(m[5]);
      out.push(href ? externalLink(href, m[4], key) : m[0]);
    } else if (m[6] !== undefined) {
      const href = safeUrl(m[6]);
      out.push(href ? externalLink(href, shorten(m[6]), key) : m[0]);
    } else if (m[7] !== undefined) {
      out.push(
        <Link key={key} href={`/u/${m[7].toLowerCase()}`} className="font-bold text-accent">
          @{m[7]}
        </Link>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { type: "p"; lines: string[] } | { type: "ul"; items: string[] } | { type: "hr" };

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();
    const last = blocks[blocks.length - 1];
    if (trimmed === "") {
      blocks.push({ type: "p", lines: [] }); // separa parágrafos
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      continue;
    }
    const item = /^[-*]\s+(.*)$/.exec(trimmed);
    if (item) {
      if (last?.type === "ul") last.items.push(item[1]);
      else blocks.push({ type: "ul", items: [item[1]] });
      continue;
    }
    if (last?.type === "p") last.lines.push(trimmed);
    else blocks.push({ type: "p", lines: [trimmed] });
  }
  return blocks.filter((b) => b.type !== "p" || b.lines.length > 0);
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = toBlocks(text);
  return (
    <div className={`flex flex-col gap-2 break-words ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "hr") return <hr key={i} className="border-border" />;
        if (b.type === "ul") {
          return (
            <ul key={i} className="list-disc pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `u${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {b.lines.map((ln, j) => (
              <span key={j}>
                {j > 0 ? <br /> : null}
                {renderInline(ln, `p${i}-${j}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Texto sem marcação, para resumos (cartões do feed, descrições de busca). */
export function stripRichText(text: string, max = 200): string {
  const plain = text
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/(\*\*|~~|\*)/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^-{3,}$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 3)}...` : plain;
}

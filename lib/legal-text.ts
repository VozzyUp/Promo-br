// Texto simples das páginas institucionais: "## título", "- item", parágrafos, **negrito** e [texto](endereço).
export type Inline = { kind: "text"; text: string } | { kind: "bold"; text: string } | { kind: "link"; text: string; href: string };
export type Block = { kind: "h2"; text: string } | { kind: "p"; inline: Inline[] } | { kind: "ul"; items: Inline[][] };

const SAFE_HREF = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const m of src.matchAll(re)) {
    if (m.index > last) out.push({ kind: "text", text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "bold", text: m[1] });
    else if (SAFE_HREF.test(m[3])) out.push({ kind: "link", text: m[2], href: m[3] });
    else out.push({ kind: "text", text: m[2] }); // endereço não permitido: fica só o texto
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

export function parseLegal(body: string): Block[] {
  const blocks: Block[] = [];
  let list: Inline[][] | null = null;
  const flush = () => {
    if (list) blocks.push({ kind: "ul", items: list });
    list = null;
  };
  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("## ")) { flush(); blocks.push({ kind: "h2", text: line.slice(3).trim() }); continue; }
    if (line.startsWith("- ")) { (list ??= []).push(parseInline(line.slice(2).trim())); continue; }
    flush();
    blocks.push({ kind: "p", inline: parseInline(line) });
  }
  flush();
  return blocks;
}
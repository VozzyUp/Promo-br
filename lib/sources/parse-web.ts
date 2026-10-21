// Leitor da página pública de um canal do Telegram (t.me/s/nome). Função pura, sem rede.
// A página mostra as publicações mais recentes, cada uma num bloco com data-post="nome/123".
import type { RawPost } from "./types";

const NAMED: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** HTML do texto da publicação para texto puro + links, negritos e riscados. */
export function htmlToPost(html: string): Pick<RawPost, "text" | "links" | "bold" | "strike"> {
  // Emoji vem como <i class="emoji"><b>🔥</b></i>: vira só o caractere, para o <b> não contar como negrito.
  let h = html.replace(/<i class="emoji"[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/i>/gi, "$1");
  h = h.replace(/<br\s*\/?>/gi, "\n");
  const links: string[] = [];
  for (const m of h.matchAll(/<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')/gi)) {
    const href = decodeEntities(m[1] ?? m[2] ?? "");
    if (/^https?:\/\//i.test(href)) links.push(href);
  }
  const plain = (frag: string) => decodeEntities(frag.replace(/<[^>]+>/g, "")).trim();
  const bold = [...h.matchAll(/<(b|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => plain(m[2])).filter(Boolean);
  const strike = [...h.matchAll(/<(s|del|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => plain(m[2])).filter(Boolean);
  const text = decodeEntities(h.replace(/<[^>]+>/g, "")).replace(/[ \t]+\n/g, "\n").trim();
  // Endereços escritos no texto sem virar link.
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) if (!links.includes(m[0])) links.push(m[0]);
  return { text, links, bold, strike };
}

/** Publicações da página t.me/s/<canal>, da mais antiga para a mais nova. */
export function parseChannelPage(html: string, channel: string): RawPost[] {
  const out: RawPost[] = [];
  const blocks = html.split(/<div class="tgme_widget_message_wrap\b/).slice(1);
  for (const block of blocks) {
    const post = /data-post="([^"/]+)\/(\d+)"/.exec(block);
    if (!post || post[1].toLowerCase() !== channel.toLowerCase()) continue;
    const id = Number(post[2]);
    const body = /<div class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1] ?? "";
    const parsed = htmlToPost(body);
    const photo = /tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/.exec(block)?.[1] ?? null;
    const when = /<time datetime="([^"]+)"/.exec(block)?.[1];
    const postedAt = when ? new Date(when) : null;
    out.push({
      id, ...parsed,
      imageUrl: photo && /^https:\/\//.test(photo) ? photo : null,
      postedAt: postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
      postUrl: `https://t.me/${post[1]}/${id}`,
    });
  }
  return out.sort((a, b) => a.id - b.id);
}

/** Aceita @nome, t.me/nome, https://t.me/s/nome ou só o nome. Devolve o nome ou null. */
export function normalizeChannel(input: string): string | null {
  const s = input.trim().replace(/^@/, "").replace(/^https?:\/\//i, "").replace(/^(www\.)?(t|telegram)\.me\/(s\/)?/i, "").replace(/[/?#].*$/, "");
  return /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s) ? s : null;
}

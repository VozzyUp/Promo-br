// Leitura da página pública de um canal (t.me/s/nome): sem login, só as publicações mais recentes.
import "server-only";
import { parseChannelPage } from "./parse-web";
import type { RawPost } from "./types";

const UA = "Mozilla/5.0 (compatible; promo-br-fontes/1.0)";

/** Publicações recentes do canal, da mais antiga para a mais nova. Lança erro com mensagem para o painel. */
export async function fetchPublicChannel(channel: string): Promise<RawPost[]> {
  // TELEGRAM_WEB_BASE só existe para os testes apontarem para um servidor de mentira.
  const base = process.env.TELEGRAM_WEB_BASE ?? "https://t.me";
  const res = await fetch(`${base}/s/${encodeURIComponent(channel)}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  // O Telegram redireciona para a página do canal quando ele não existe, é privado ou escondeu a prévia.
  if (res.status >= 300 && res.status < 400) throw new Error("Canal não encontrado, privado ou sem prévia pública. Para grupos privados, use a conta logada.");
  if (!res.ok) throw new Error(`O Telegram respondeu ${res.status}.`);
  const html = await res.text();
  const posts = parseChannelPage(html, channel);
  if (posts.length === 0 && !/tgme_channel_info/.test(html)) throw new Error("A página do canal veio em um formato que não reconheço.");
  return posts;
}

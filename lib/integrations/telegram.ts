// Cliente mínimo da Bot API do Telegram.
import "server-only";

type TgResponse<T> = { ok: boolean; result?: T; description?: string };

async function call<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  // TELEGRAM_API_BASE só existe para os testes apontarem para um servidor de mentira.
  const base = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";
  const res = await fetch(`${base}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as TgResponse<T> | null;
  if (!json?.ok || json.result === undefined) throw new Error(json?.description ?? `Telegram respondeu ${res.status}.`);
  return json.result;
}

export const getMe = (token: string) => call<{ username: string }>(token, "getMe");

/** Texto em HTML (só <b>, <i>, <a>). Devolve o id da mensagem. */
export async function sendMessage(token: string, chatId: string, html: string): Promise<string> {
  const r = await call<{ message_id: number }>(token, "sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: false } });
  return String(r.message_id);
}

export async function sendPhoto(token: string, chatId: string, photoUrl: string, html: string): Promise<string> {
  const r = await call<{ message_id: number }>(token, "sendPhoto", { chat_id: chatId, photo: photoUrl, caption: html, parse_mode: "HTML" });
  return String(r.message_id);
}
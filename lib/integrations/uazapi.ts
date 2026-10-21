// Cliente mínimo da UAZAPI (WhatsApp).
import "server-only";

export type UazapiConfig = { baseUrl: string; token: string };

async function call<T>(cfg: UazapiConfig, path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}${path}`, {
    method: body ? "POST" : "GET",
    headers: { token: cfg.token, "Content-Type": "application/json; charset=utf-8" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !json) throw new Error(`UAZAPI respondeu ${res.status}${json?.error ? `: ${json.error}` : ""}`);
  return json;
}

export const instanceStatus = (cfg: UazapiConfig) => call<{ status?: string; instance?: { status?: string } }>(cfg, "/instance/status");

export async function sendText(cfg: UazapiConfig, number: string, text: string): Promise<string> {
  const r = await call<{ messageid?: string }>(cfg, "/send/text", { number, text });
  return r.messageid ?? "";
}

export async function sendImage(cfg: UazapiConfig, number: string, imageUrl: string, caption: string): Promise<string> {
  const r = await call<{ messageid?: string }>(cfg, "/send/media", { number, type: "image", file: imageUrl, text: caption });
  return r.messageid ?? "";
}
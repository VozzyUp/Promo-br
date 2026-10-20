import type { Store } from "./types";

export type LinkCheck =
  | { ok: true; url: URL; host: string }
  | { ok: false; reason: string };

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[?::1\]?$|\[?f[cd])/i;

/** Valida o link colado pelo usuário. O link NUNCA é reescrito: a tag de afiliado do autor é mantida. */
export function checkSubmittedUrl(raw: string): LinkCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Cole o endereço completo da oferta, começando com https://" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "Só aceitamos links http ou https." };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (PRIVATE_HOST.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { ok: false, reason: "Esse endereço não parece ser de uma loja." };
  }
  return { ok: true, url, host };
}

export function findStoreForHost(host: string, stores: Store[]): Store | undefined {
  return stores.find((s) => s.domains.some((d) => host === d || host.endsWith(`.${d}`)));
}

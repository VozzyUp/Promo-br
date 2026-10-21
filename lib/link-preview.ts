// Leitura pública de um link de oferta: título, imagem e preço (og:*, meta de produto e JSON-LD).
// Só o que a loja já mostra a qualquer visitante; uma página por vez, sem login e sem scraping pesado.
// O servidor só conecta em endereços públicos (ver net-safety) e conecta no IP que ele mesmo validou.
import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { parsePreview, type Preview } from "./link-preview-parse";
import { isPublicIp } from "./net-safety";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 6000;
const UA = "Mozilla/5.0 (compatible; promo-br-linkpreview/1.0)";

type Got = { status: number; finalUrl: URL; contentType: string; body: Buffer; location?: string };
type Target = { address: string; family: number };

async function validatedAddress(url: URL): Promise<Target> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocolo não permitido");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("porta não permitida");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (!isPublicIp(host)) throw new Error("endereço não permitido");
    return { address: host, family: isIP(host) };
  }
  const found = await lookup(host, { all: true });
  if (found.length === 0 || found.some((a) => !isPublicIp(a.address))) throw new Error("endereço não permitido");
  return found[0];
}

function getOnce(url: URL, target: Target, opts: { maxBytes: number; accept: string }): Promise<Got> {
  return new Promise((resolve, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(
      url,
      {
        method: "GET",
        timeout: TIMEOUT_MS,
        headers: { "User-Agent": UA, Accept: opts.accept, "Accept-Language": "pt-BR,pt;q=0.9", "Accept-Encoding": "identity" },
        // Conecta no IP já validado: impede trocar o DNS entre a checagem e a conexão.
        lookup: (_host, options, cb) => {
          if ((options as { all?: boolean }).all) (cb as unknown as (e: null, a: Target[]) => void)(null, [target]);
          else cb(null, target.address, target.family);
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const done = () =>
          resolve({
            status: res.statusCode ?? 0, finalUrl: url, contentType: String(res.headers["content-type"] ?? ""),
            body: Buffer.concat(chunks), location: typeof res.headers.location === "string" ? res.headers.location : undefined,
          });
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > opts.maxBytes) {
            res.destroy();
            done();
            return;
          }
          chunks.push(c);
        });
        res.on("end", done);
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("tempo esgotado")));
    req.on("error", reject);
    req.end();
  });
}

/** GET seguro com até 3 redirecionamentos, cada um revalidado. */
export async function safeGet(rawUrl: string, opts: { maxBytes: number; accept: string }): Promise<Got> {
  let url = new URL(rawUrl);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const got = await getOnce(url, await validatedAddress(url), opts);
    if (got.status >= 300 && got.status < 400 && got.location) {
      url = new URL(got.location, url);
      continue;
    }
    return got;
  }
  throw new Error("redirecionamentos demais");
}

/** Uma só ida ao link: o endereço final (depois de expandir encurtadores) e, se for HTML, o que a página mostra. */
export async function fetchLinkInfo(rawUrl: string): Promise<{ finalUrl: URL | null; preview: Preview | null }> {
  try {
    const got = await safeGet(rawUrl, { maxBytes: 600_000, accept: "text/html,application/xhtml+xml" });
    const ok = got.status >= 200 && got.status < 300 && /html/i.test(got.contentType);
    return { finalUrl: got.finalUrl, preview: ok ? parsePreview(got.body.toString("utf8"), got.finalUrl.toString()) : null };
  } catch {
    return { finalUrl: null, preview: null };
  }
}

/** Lê título, imagem e preço do link. Devolve null se a página não responder como HTML. */
export async function fetchPreview(rawUrl: string): Promise<Preview | null> {
  return (await fetchLinkInfo(rawUrl)).preview;
}

/** Só segue os redirecionamentos e devolve o endereço final (para encurtadores como amzn.to). */
export async function resolveFinalUrl(rawUrl: string): Promise<URL | null> {
  try {
    return (await safeGet(rawUrl, { maxBytes: 20_000, accept: "text/html,*/*" })).finalUrl;
  } catch {
    return null;
  }
}

/** Baixa a imagem do link (até maxBytes). Quem chama confere os bytes com image-check antes de guardar. */
export async function fetchImageBytes(imageUrl: string, maxBytes: number): Promise<Uint8Array | null> {
  try {
    const got = await safeGet(imageUrl, { maxBytes: maxBytes + 1, accept: "image/*" });
    if (got.status < 200 || got.status >= 300 || !/^image\//i.test(got.contentType) || got.body.length > maxBytes) return null;
    return new Uint8Array(got.body);
  } catch {
    return null;
  }
}

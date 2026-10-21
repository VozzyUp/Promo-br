// Criptografia das credenciais guardadas no banco: AES-256-GCM com a MASTER_KEY do ambiente.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function masterKey(): Buffer {
  const raw = process.env.MASTER_KEY ?? "";
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("MASTER_KEY ausente ou inválida: use 32 bytes em hexadecimal (openssl rand -hex 32).");
  return key;
}

export function hasMasterKey(): boolean {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}

/** Devolve "iv:tag:texto" em base64. */
export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", masterKey(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(":");
}

export function decryptJson<T = unknown>(payload: string): T {
  const [iv, tag, body] = payload.split(":").map((p) => Buffer.from(p, "base64"));
  if (!iv || !tag || !body) throw new Error("Credencial em formato inválido.");
  const d = createDecipheriv("aes-256-gcm", masterKey(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString("utf8")) as T;
}
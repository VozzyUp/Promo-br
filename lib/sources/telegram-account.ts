// Conta do Telegram logada (MTProto, biblioteca GramJS): lê grupos e canais em que a conta participa, inclusive privados.
// A sessão fica criptografada no banco (integrations.telegram_user). Só leitura: o site nunca envia mensagem por esta conta.
import "server-only";
import bigInt from "big-integer";
import { Api, TelegramClient } from "telegram";
import { Logger, LogLevel } from "telegram/extensions/Logger";
import { computeCheck } from "telegram/Password";
import { StringSession } from "telegram/sessions";
import { decryptJson, encryptJson, hasMasterKey } from "../crypto";
import { db } from "../supabase/db";
import type { RawPost } from "./types";

const KEY = "telegram_user";

type Pending = { session: string; phoneCodeHash: string; needsPassword: boolean };
type Secret = { apiHash: string; session?: string; pending?: Pending };
type Public = { apiId: string; phone: string; account?: string };

export type AccountStatus = { connected: boolean; account: string | null; apiId: string | null; phone: string | null; waitingCode: boolean; needsPassword: boolean };
export type AccountChat = { target: string; title: string; kind: "canal" | "grupo" };

async function load(): Promise<{ pub: Public; sec: Secret } | null> {
  const { data, error } = await db().from("integrations").select("public_config, config_encrypted").eq("key", KEY).maybeSingle();
  if (error) throw error;
  const row = data as { public_config: Public; config_encrypted: string | null } | null;
  if (!row?.config_encrypted) return null;
  return { pub: row.public_config, sec: decryptJson<Secret>(row.config_encrypted) };
}

async function save(pub: Public, sec: Secret, connected: boolean) {
  const { error } = await db().from("integrations").upsert({
    key: KEY, enabled: connected, public_config: pub, config_encrypted: encryptJson(sec),
    status: connected ? "ok" : "untested", last_error: null, updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw error;
}

function client(apiId: string, apiHash: string, session: string) {
  return new TelegramClient(new StringSession(session), Number(apiId), apiHash, { connectionRetries: 2, baseLogger: new Logger(LogLevel.ERROR) });
}

const rpcError = (e: unknown) => (e as { errorMessage?: string })?.errorMessage ?? "";

const FRIENDLY: Record<string, string> = {
  PHONE_NUMBER_INVALID: "Número de telefone inválido. Use o formato +55 DDD número.",
  PHONE_CODE_INVALID: "Código errado. Confira e tente de novo.",
  PHONE_CODE_EXPIRED: "O código expirou. Peça um novo.",
  PASSWORD_HASH_INVALID: "Senha de duas etapas errada.",
  API_ID_INVALID: "api_id ou api_hash inválidos. Confira em my.telegram.org.",
  FLOOD_WAIT: "O Telegram pediu para esperar antes de tentar de novo.",
};

function friendly(e: unknown): Error {
  const code = rpcError(e);
  const key = Object.keys(FRIENDLY).find((k) => code.startsWith(k));
  return new Error(key ? FRIENDLY[key] : e instanceof Error ? e.message.slice(0, 200) : "Falha ao falar com o Telegram.");
}

export async function accountStatus(): Promise<AccountStatus> {
  const empty: AccountStatus = { connected: false, account: null, apiId: null, phone: null, waitingCode: false, needsPassword: false };
  if (!hasMasterKey()) return empty;
  const s = await load().catch(() => null);
  if (!s) return empty;
  return {
    connected: !!s.sec.session, account: s.pub.account ?? null, apiId: s.pub.apiId, phone: s.pub.phone,
    waitingCode: !!s.sec.pending && !s.sec.pending.needsPassword, needsPassword: !!s.sec.pending?.needsPassword,
  };
}

/** Passo 1: o Telegram manda um código para o aplicativo (ou SMS) desse número. */
export async function startLogin(apiId: string, apiHash: string, phone: string): Promise<void> {
  if (!hasMasterKey()) throw new Error("MASTER_KEY não configurada no servidor: não dá para guardar a sessão com segurança.");
  const c = client(apiId, apiHash, "");
  try {
    await c.connect();
    const r = await c.sendCode({ apiId: Number(apiId), apiHash }, phone);
    await save({ apiId, phone }, { apiHash, pending: { session: String(c.session.save()), phoneCodeHash: r.phoneCodeHash, needsPassword: false } }, false);
  } catch (e) {
    throw friendly(e);
  } finally {
    await c.disconnect().catch(() => {});
  }
}

async function finish(c: TelegramClient, pub: Public, sec: Secret) {
  const me = (await c.getMe()) as Api.User;
  const account = me.username ? `@${me.username}` : [me.firstName, me.lastName].filter(Boolean).join(" ") || pub.phone;
  await save({ ...pub, account }, { apiHash: sec.apiHash, session: String(c.session.save()) }, true);
}

/** Passo 2: o código recebido. Se a conta tiver senha de duas etapas, pede o passo 3. */
export async function submitCode(code: string): Promise<{ needsPassword: boolean }> {
  const s = await load();
  if (!s?.sec.pending) throw new Error("Peça o código de novo.");
  const c = client(s.pub.apiId, s.sec.apiHash, s.sec.pending.session);
  try {
    await c.connect();
    const r = await c.invoke(new Api.auth.SignIn({ phoneNumber: s.pub.phone, phoneCodeHash: s.sec.pending.phoneCodeHash, phoneCode: code.replace(/\D/g, "") }));
    if (r instanceof Api.auth.AuthorizationSignUpRequired) throw new Error("Esse número não tem conta no Telegram.");
    await finish(c, s.pub, s.sec);
    return { needsPassword: false };
  } catch (e) {
    if (rpcError(e) === "SESSION_PASSWORD_NEEDED") {
      await save(s.pub, { ...s.sec, pending: { ...s.sec.pending, session: String(c.session.save()), needsPassword: true } }, false);
      return { needsPassword: true };
    }
    throw friendly(e);
  } finally {
    await c.disconnect().catch(() => {});
  }
}

/** Passo 3 (só com verificação em duas etapas): a senha da nuvem do Telegram. Não é guardada. */
export async function submitPassword(password: string): Promise<void> {
  const s = await load();
  if (!s?.sec.pending?.needsPassword) throw new Error("Comece o login de novo.");
  const c = client(s.pub.apiId, s.sec.apiHash, s.sec.pending.session);
  try {
    await c.connect();
    const pwd = await c.invoke(new Api.account.GetPassword());
    await c.invoke(new Api.auth.CheckPassword({ password: await computeCheck(pwd, password) }));
    await finish(c, s.pub, s.sec);
  } catch (e) {
    throw friendly(e);
  } finally {
    await c.disconnect().catch(() => {});
  }
}

export async function logoutAccount(): Promise<void> {
  const s = await load().catch(() => null);
  if (s?.sec.session) {
    const c = client(s.pub.apiId, s.sec.apiHash, s.sec.session);
    try {
      await c.connect();
      await c.invoke(new Api.auth.LogOut());
    } catch {
      // mesmo sem conseguir avisar o Telegram, a sessão sai daqui
    } finally {
      await c.disconnect().catch(() => {});
    }
  }
  await db().from("integrations").delete().eq("key", KEY);
}

// Uma conexão por vez: a mesma sessão aberta duas vezes ao mesmo tempo dá erro no Telegram.
let queue: Promise<unknown> = Promise.resolve();

/** Abre a conta, roda fn e fecha. Chamadas simultâneas esperam a vez. */
export function withAccount<T>(fn: (c: TelegramClient) => Promise<T>): Promise<T> {
  const run = async () => {
    const s = await load();
    if (!s?.sec.session) throw new Error("A conta do Telegram não está conectada. Entre em Fontes > Conta do Telegram.");
    const c = client(s.pub.apiId, s.sec.apiHash, s.sec.session);
    try {
      await c.connect();
      return await fn(c);
    } catch (e) {
      throw friendly(e);
    } finally {
      await c.disconnect().catch(() => {});
    }
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

/** Destino guardado na fonte: "channel:<id>:<hash>" (canal ou supergrupo) ou "chat:<id>" (grupo comum). */
function peerOf(target: string): Api.TypeInputPeer {
  const ch = /^channel:(\d+):(-?\d+)$/.exec(target);
  if (ch) return new Api.InputPeerChannel({ channelId: bigInt(ch[1]), accessHash: bigInt(ch[2]) });
  const chat = /^chat:(\d+)$/.exec(target);
  if (chat) return new Api.InputPeerChat({ chatId: bigInt(chat[1]) });
  throw new Error("Grupo inválido. Escolha de novo na lista da conta.");
}

export async function listAccountChats(): Promise<AccountChat[]> {
  return withAccount(async (c) => {
    const dialogs = await c.getDialogs({ limit: 300 });
    const out: AccountChat[] = [];
    for (const d of dialogs) {
      const p = d.inputEntity;
      if (p instanceof Api.InputPeerChannel) out.push({ target: `channel:${p.channelId}:${p.accessHash}`, title: d.title ?? "Sem nome", kind: d.isGroup ? "grupo" : "canal" });
      else if (p instanceof Api.InputPeerChat) out.push({ target: `chat:${p.chatId}`, title: d.title ?? "Sem nome", kind: "grupo" });
    }
    return out;
  });
}

function toRawPost(m: Api.Message, target: string): RawPost {
  const text = m.message ?? "";
  const links: string[] = [];
  const bold: string[] = [];
  const strike: string[] = [];
  for (const e of m.entities ?? []) {
    const frag = text.substr(e.offset, e.length); // os dois contam em unidades UTF-16
    if (e.className === "MessageEntityTextUrl") links.push((e as Api.MessageEntityTextUrl).url);
    else if (e.className === "MessageEntityUrl") links.push(/^https?:\/\//i.test(frag) ? frag : `https://${frag}`);
    else if (e.className === "MessageEntityBold") bold.push(frag.trim());
    else if (e.className === "MessageEntityStrike") strike.push(frag.trim());
  }
  // Botões com link ("Comprar", "Ver oferta") embaixo da mensagem.
  const markup = m.replyMarkup;
  if (markup && markup.className === "ReplyInlineMarkup") {
    for (const row of (markup as Api.ReplyInlineMarkup).rows) for (const b of row.buttons) if (b.className === "KeyboardButtonUrl") links.push((b as Api.KeyboardButtonUrl).url);
  }
  const channelId = /^channel:(\d+):/.exec(target)?.[1];
  return {
    id: m.id, postedAt: m.date ? new Date(m.date * 1000) : null, text, links: [...new Set(links)], bold, strike,
    imageUrl: null, postUrl: channelId ? `https://t.me/c/${channelId}/${m.id}` : null,
  };
}

export type AccountPosts = { posts: RawPost[]; photo: (id: number) => Promise<Uint8Array | null> };

/** Mensagens mais novas que minId (até limit), da mais antiga para a mais nova. Usar dentro de withAccount. */
export async function readAccountPosts(c: TelegramClient, target: string, minId: number | null, limit: number): Promise<AccountPosts> {
  const msgs = await c.getMessages(peerOf(target), { limit, ...(minId ? { minId } : {}) });
  const byId = new Map<number, Api.Message>();
  const posts: RawPost[] = [];
  for (const m of msgs) {
    if (!(m instanceof Api.Message) || !m.message) continue;
    byId.set(m.id, m);
    posts.push(toRawPost(m, target));
  }
  posts.sort((a, b) => a.id - b.id);
  return {
    posts,
    photo: async (id) => {
      const m = byId.get(id);
      if (!m?.photo) return null;
      const buf = await c.downloadMedia(m, {}).catch(() => undefined);
      return buf && typeof buf !== "string" && buf.length <= 3 * 1024 * 1024 ? new Uint8Array(buf) : null;
    },
  };
}

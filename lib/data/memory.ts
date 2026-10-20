// Camada de dados FALSA (em memória) para a fatia vertical.
// As funções exportadas por ./index.ts têm as mesmas assinaturas da futura camada Supabase:
// trocar a implementação não deve mudar nenhuma tela.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { slugify } from "../format";
import type { Category, Deal, DealView, FeedTab, Profile, Store } from "../types";
import { ADMIN_EMAIL, ADMIN_USER_ID, seedCategories, seedDeals, seedProfiles, seedStores } from "./seed";

type Credential = { userId: string; email: string; hash: string; salt: string; emailConfirmed: boolean };
type Click = { dealId: string; visitorHash: string; channel: string; at: number };
type Db = {
  profiles: Map<string, Profile>;
  credentials: Map<string, Credential>; // por e-mail
  stores: Store[];
  categories: Category[];
  deals: Map<string, Deal>;
  votes: Map<string, -1 | 1>; // `${dealId}:${userId}`
  clicks: Click[];
  clickKeys: Set<string>; // dedup por visitante/oferta/dia
};

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

/** Código curto do /ir/ e sufixo do slug: só [0-9a-f], nunca termina o slug com "-". */
function newCode() {
  return randomBytes(4).toString("hex");
}

function build(): Db {
  const db: Db = {
    profiles: new Map(seedProfiles.map((p) => [p.id, { ...p }])),
    credentials: new Map(),
    stores: seedStores.map((s) => ({ ...s })),
    categories: seedCategories,
    deals: new Map(),
    votes: new Map(),
    clicks: [],
    clickKeys: new Set(),
  };
  const adminPassword = process.env.DEV_ADMIN_PASSWORD;
  if (adminPassword) {
    db.credentials.set(ADMIN_EMAIL, { userId: ADMIN_USER_ID, email: ADMIN_EMAIL, emailConfirmed: true, ...hashPassword(adminPassword) });
  }
  for (const s of seedDeals) {
    const { hours, up, down, clicks, ...rest } = s;
    const id = randomUUID();
    const code = newCode();
    db.deals.set(id, {
      ...rest, id, code, slug: `${slugify(rest.title)}-${code.slice(0, 4).toLowerCase()}`,
      votesUp: up, votesDown: down, clicksTotal: clicks, commentsCount: 0,
      createdAt: new Date(Date.now() - hours * 3600_000).toISOString(),
    });
  }
  return db;
}

// Sobrevive ao hot reload do `next dev`.
const g = globalThis as unknown as { __promoDb?: Db };
export const db: Db = (g.__promoDb ??= build());

/* ------------------------------------------------------------------ helpers */

export function temperatureOf(d: Pick<Deal, "votesUp" | "votesDown">) {
  // Provisório: cada voto vale 10°. Os pesos reais vêm do painel (RankingConfig).
  return (d.votesUp - d.votesDown) * 10;
}

function clicks24h(dealId: string) {
  const since = Date.now() - 86400_000;
  return db.clicks.filter((c) => c.dealId === dealId && c.at >= since).length;
}

/** Fórmula de replica/recon.md (pesos padrão; virão do painel). */
export function hotScore(d: Deal) {
  const discount = (d.realDiscountBp ?? 0) / 100;
  const verified = d.verdict === "verified" ? 1 : 0;
  const ageHours = (Date.now() - new Date(d.publishedAt ?? d.createdAt).getTime()) / 3600_000;
  const raw = 0.5 * discount + 4 * Math.log1p(clicks24h(d.id) + d.clicksTotal / 10) + 1.5 * (d.votesUp - d.votesDown) + 8 * verified;
  return raw / Math.pow(ageHours + 2, 1.5);
}

export function toView(d: Deal, viewerId: string | null): DealView {
  const store = db.stores.find((s) => s.id === d.storeId)!;
  const category = db.categories.find((c) => c.id === d.categoryId) ?? null;
  const a = db.profiles.get(d.authorId)!;
  const myVote = viewerId ? (db.votes.get(`${d.id}:${viewerId}`) ?? 0) : 0;
  return {
    ...d, store, category,
    author: { id: a.id, username: a.username, displayName: a.displayName, avatarUrl: a.avatarUrl, role: a.role },
    temperature: temperatureOf(d),
    myVote,
  };
}

/* ------------------------------------------------------------------ leitura */

export async function listFeed(opts: { tab: FeedTab; viewerId: string | null; limit?: number; offset?: number }) {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  let items = [...db.deals.values()].filter((d) => d.status === "published");
  if (opts.tab === "novas") {
    items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  } else if (opts.tab === "descontos") {
    items = items.filter((d) => d.verdict === "verified" || d.verdict === "good_price");
    items.sort((a, b) => (b.realDiscountBp ?? 0) - (a.realDiscountBp ?? 0));
  } else {
    items.sort((a, b) => hotScore(b) - hotScore(a));
  }
  const page = items.slice(offset, offset + limit).map((d) => toView(d, opts.viewerId));
  return { items: page, nextOffset: offset + limit < items.length ? offset + limit : null };
}

export async function listHot(limit: number, viewerId: string | null) {
  return (await listFeed({ tab: "quentes", viewerId, limit })).items;
}

export async function getDealBySlug(slug: string, viewer: { id: string; role: string } | null) {
  const d = [...db.deals.values()].find((x) => x.slug === slug);
  if (!d) return null;
  const visible = d.status === "published" || d.status === "expired";
  const canSeeHidden = viewer && (viewer.id === d.authorId || viewer.role === "admin" || viewer.role === "moderator");
  if (!visible && !canSeeHidden) return null;
  return toView(d, viewer?.id ?? null);
}

export async function getDealByCode(code: string) {
  return [...db.deals.values()].find((d) => d.code === code) ?? null;
}

export async function listCategories() {
  return db.categories;
}

export async function listStores() {
  return db.stores;
}

export async function getProfile(id: string) {
  return db.profiles.get(id) ?? null;
}

export async function listPendingDeals() {
  return [...db.deals.values()]
    .filter((d) => d.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((d) => toView(d, null));
}

/* ------------------------------------------------------------------ escrita */

export async function recordClick(dealId: string, visitorHash: string, channel: string) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${dealId}:${visitorHash}:${day}`;
  if (db.clickKeys.has(key)) return;
  db.clickKeys.add(key);
  db.clicks.push({ dealId, visitorHash, channel, at: Date.now() });
  const d = db.deals.get(dealId);
  if (d) d.clicksTotal += 1;
}

export async function createStoreForHost(host: string) {
  const name = host.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
  const store: Store = { id: `st-${randomUUID().slice(0, 8)}`, name, slug: slugify(host), domains: [host], status: "pending_review" };
  db.stores.push(store);
  return store;
}

export type NewDeal = {
  authorId: string;
  title: string;
  description: string;
  storeId: string;
  categoryId: string | null;
  urlSubmitted: string;
  priceCents: number | null;
  listPriceCents: number | null;
  couponCode: string | null;
  publish: boolean;
};

export async function createDeal(input: NewDeal) {
  const id = randomUUID();
  const code = newCode();
  const now = new Date().toISOString();
  const deal: Deal = {
    id, code, slug: `${slugify(input.title)}-${code.slice(0, 4).toLowerCase()}`,
    title: input.title, description: input.description, authorId: input.authorId, source: "user",
    storeId: input.storeId, categoryId: input.categoryId, urlSubmitted: input.urlSubmitted,
    priceCents: input.priceCents, listPriceCents: input.listPriceCents,
    couponCode: input.couponCode, couponPercent: null, imageUrl: null,
    verdict: "pending", realDiscountBp: null,
    status: input.publish ? "published" : "pending", rejectReason: null,
    publishedAt: input.publish ? now : null, expiresAt: null,
    votesUp: 0, votesDown: 0, clicksTotal: 0, commentsCount: 0, createdAt: now,
  };
  db.deals.set(id, deal);
  return deal;
}

export async function countDealsByAuthorSince(authorId: string, sinceIso: string) {
  return [...db.deals.values()].filter((d) => d.authorId === authorId && d.createdAt >= sinceIso).length;
}

export async function isUsernameTaken(username: string) {
  return [...db.profiles.values()].some((p) => p.username === username);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- mesma assinatura da camada Supabase (auditoria)
export async function moderateDeal(id: string, action: "approve" | "reject", reason: string | null, moderatorId: string | null = null) {
  const d = db.deals.get(id);
  if (!d || d.status !== "pending") return null;
  if (action === "approve") {
    d.status = "published";
    d.publishedAt = new Date().toISOString();
    const author = db.profiles.get(d.authorId);
    if (author) {
      author.approvedPosts += 1;
      author.reputation += 10;
      if (author.approvedPosts >= 3) author.trusted = true;
    }
  } else {
    d.status = "rejected";
    d.rejectReason = reason;
  }
  return d;
}

export async function vote(dealId: string, userId: string, value: -1 | 1) {
  const d = db.deals.get(dealId);
  if (!d || d.status !== "published") return null;
  const key = `${dealId}:${userId}`;
  const prev = db.votes.get(key);
  if (prev === value) {
    // clicar de novo no mesmo voto desfaz
    db.votes.delete(key);
    if (value === 1) d.votesUp -= 1; else d.votesDown -= 1;
  } else {
    if (prev === 1) d.votesUp -= 1;
    if (prev === -1) d.votesDown -= 1;
    db.votes.set(key, value);
    if (value === 1) d.votesUp += 1; else d.votesDown += 1;
  }
  return { temperature: temperatureOf(d), myVote: (db.votes.get(key) ?? 0) as -1 | 0 | 1 };
}

/* ------------------------------------------------------------------ contas */

export async function createUser(input: { email: string; password: string; username: string; displayName: string }) {
  const email = input.email.toLowerCase();
  if (db.credentials.has(email)) return { error: "Já existe uma conta com esse e-mail." as const };
  if ([...db.profiles.values()].some((p) => p.username === input.username)) {
    return { error: "Esse nome de usuário já está em uso." as const };
  }
  const id = randomUUID();
  db.profiles.set(id, {
    id, username: input.username, displayName: input.displayName, avatarUrl: null, role: "user",
    reputation: 0, trusted: false, approvedPosts: 0, bannedAt: null, createdAt: new Date().toISOString(),
  });
  // Camada falsa: e-mail já confirmado. No Supabase Auth a confirmação é obrigatória.
  db.credentials.set(email, { userId: id, email, emailConfirmed: true, ...hashPassword(input.password) });
  return { profile: db.profiles.get(id)! };
}

export async function authenticate(email: string, password: string) {
  const cred = db.credentials.get(email.toLowerCase());
  if (!cred) return null;
  const { hash } = hashPassword(password, cred.salt);
  const ok = timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(cred.hash, "hex"));
  return ok ? (db.profiles.get(cred.userId) ?? null) : null;
}

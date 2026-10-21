"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { countDealsByAuthorSince, createDeal, createStoreForHost, getProfile, listStores } from "@/lib/data";
import { findDuplicateByKey, notifyPublished, saveDealImages, type DuplicateDeal } from "@/lib/data/publish";
import { parsePriceToCents } from "@/lib/format";
import { checkImage } from "@/lib/image-check";
import { fetchImageBytes, fetchPreview } from "@/lib/link-preview";
import type { Preview } from "@/lib/link-preview-parse";
import { isHostBlocked } from "@/lib/data/admin";
import { checkSubmittedUrl, findStoreForHost } from "@/lib/links";
import { supabaseEnabled } from "@/lib/supabase/server";
import { urlKey } from "@/lib/url-key";

export type LinkCheckResult =
  | { ok: false; error: string }
  | { ok: true; host: string; storeName: string | null; duplicate: DuplicateDeal | null; preview: Preview | null };

export type PublishState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const MAX_PER_DAY_NEW = 5;
const MAX_PER_DAY_TRUSTED = 30;
const SP_OFFSET = "-03:00"; // horário de Brasília (sem horário de verão desde 2019)

/** Passo 1: confere o link, procura oferta repetida e tenta ler título, imagem e preço da página. */
export async function checkLinkAction(raw: string): Promise<LinkCheckResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Entre na sua conta para publicar." };
  const link = checkSubmittedUrl(String(raw ?? ""));
  if (!link.ok) return { ok: false, error: link.reason };
  const stores = await listStores();
  const store = findStoreForHost(link.host, stores);
  if (store?.status === "blocked" || (supabaseEnabled() && (await isHostBlocked(link.host)))) {
    return { ok: false, error: "Não aceitamos ofertas desta loja." };
  }
  const [duplicate, preview] = await Promise.all([
    supabaseEnabled() ? findDuplicateByKey(urlKey(link.url)) : Promise.resolve(null),
    fetchPreview(link.url.toString()),
  ]);
  return { ok: true, host: link.host, storeName: store?.name ?? null, duplicate, preview };
}

const text = (max: number) => z.string().trim().max(max);

const schema = z.object({
  kind: z.enum(["deal", "coupon"]),
  availability: z.enum(["online", "offline"]),
  url: text(2000).optional(),
  title: z.string().trim().min(10, "O título precisa ter pelo menos 10 caracteres.").max(140, "Máximo de 140 caracteres."),
  price: text(20).optional(),
  listPrice: text(20).optional(),
  shipping: text(20).optional(),
  shipsFrom: text(60).optional(),
  categoryId: z.union([z.string().uuid(), z.literal("")]).optional(),
  couponCode: text(40).optional(),
  couponKind: z.enum(["percent", "amount", "free_shipping", "other", ""]).optional(),
  couponValue: text(20).optional(),
  startsAt: text(25).optional(),
  expiresAt: text(25).optional(),
  description: text(5000).optional(),
  previewImageUrl: text(2000).optional(),
});

function localToIso(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(`${v}${v.length === 16 ? ":00" : ""}${SP_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function publishAction(_prev: PublishState, form: FormData): Promise<PublishState> {
  const session = await getSession();
  if (!session) redirect("/entrar?next=/publicar");
  const profile = await getProfile(session.userId);
  if (!profile || profile.bannedAt) return { error: "Sua conta não pode publicar no momento." };

  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, error: "Confira os campos marcados." };
  }
  const d = parsed.data;
  const isCoupon = d.kind === "coupon";
  const fe: Record<string, string> = {};

  // Link: obrigatório para online; opcional para loja física.
  let link: ReturnType<typeof checkSubmittedUrl> | null = null;
  if (d.url) {
    link = checkSubmittedUrl(d.url);
    if (!link.ok) fe.url = link.reason;
  } else if (d.availability === "online") {
    fe.url = "Cole o link da oferta.";
  }

  const priceCents = d.price ? parsePriceToCents(d.price) : null;
  const listPriceCents = d.listPrice ? parsePriceToCents(d.listPrice) : null;
  const shippingCents = d.shipping ? parsePriceToCents(d.shipping) : null;
  if (d.price && priceCents == null) fe.price = "Preço inválido. Exemplo: 199,90";
  if (d.listPrice && listPriceCents == null) fe.listPrice = "Preço inválido. Exemplo: 399,90";
  if (d.shipping && shippingCents == null) fe.shipping = "Valor inválido. Use 0 para frete grátis.";
  if (priceCents != null && listPriceCents != null && listPriceCents <= priceCents) fe.listPrice = "O preço anterior precisa ser maior que o atual.";

  const couponCode = d.couponCode ? d.couponCode.toUpperCase() : null;
  let couponKind = d.couponKind || null;
  let couponPercent: number | null = null;
  let couponAmountCents: number | null = null;
  if (isCoupon) {
    if (!couponKind) fe.couponKind = "Escolha o tipo de desconto.";
    if (!couponCode && couponKind !== "free_shipping") fe.couponCode = "Informe o código do cupom.";
    if (couponKind === "percent") {
      const n = Number((d.couponValue ?? "").replace(",", "."));
      if (!Number.isFinite(n) || n < 1 || n > 100) fe.couponValue = "Informe de 1 a 100.";
      else couponPercent = Math.round(n);
    }
    if (couponKind === "amount") {
      couponAmountCents = d.couponValue ? parsePriceToCents(d.couponValue) : null;
      if (couponAmountCents == null || couponAmountCents <= 0) fe.couponValue = "Informe o valor do desconto.";
    }
  } else {
    couponKind = null;
    if (priceCents == null) fe.price = "Informe o preço da oferta.";
  }

  const startsAt = localToIso(d.startsAt);
  const expiresAt = localToIso(d.expiresAt);
  if (d.startsAt && !startsAt) fe.startsAt = "Data inválida.";
  if (d.expiresAt && !expiresAt) fe.expiresAt = "Data inválida.";
  if (startsAt && expiresAt && expiresAt <= startsAt) fe.expiresAt = "O fim precisa ser depois do início.";
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) fe.expiresAt = "Essa data já passou.";
  if (!d.categoryId) fe.categoryId = "Escolha uma categoria.";

  // Imagens: conferidas pelos bytes. A primeira é a principal.
  const maxImages = isCoupon ? 6 : 8;
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > maxImages) fe.images = `No máximo ${maxImages} imagens.`;
  const images: Uint8Array[] = [];
  for (const f of files.slice(0, maxImages)) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const problem = checkImage(bytes);
    if (problem) {
      fe.images = `${f.name}: ${problem}`;
      break;
    }
    images.push(bytes);
  }

  if (Object.keys(fe).length > 0) return { fieldErrors: fe, error: "Confira os campos marcados." };

  // Sem imagem enviada, usa a da página do link (baixada pelo servidor, só de endereço público, e conferida pelos bytes).
  if (images.length === 0 && d.previewImageUrl && link?.ok) {
    const bytes = await fetchImageBytes(d.previewImageUrl, 3 * 1024 * 1024);
    if (bytes && !checkImage(bytes)) images.push(bytes);
  }

  const isStaff = session.role === "admin" || session.role === "moderator" || session.role === "system";
  const limit = profile.trusted || isStaff ? MAX_PER_DAY_TRUSTED : MAX_PER_DAY_NEW;
  if ((await countDealsByAuthorSince(profile.id, new Date(Date.now() - 86400_000).toISOString())) >= limit) {
    return { error: `Você atingiu o limite de ${limit} publicações em 24 horas. Tente de novo mais tarde.` };
  }

  // Loja: pelo domínio do link; sem link (loja física), uma loja genérica criada na primeira vez.
  const stores = await listStores();
  let store = link?.ok ? findStoreForHost(link.host, stores) : stores.find((s) => s.slug === "loja-fisica");
  if (store?.status === "blocked" || (link?.ok && supabaseEnabled() && (await isHostBlocked(link.host)))) {
    return { fieldErrors: { url: "Não aceitamos ofertas desta loja." }, error: "Confira os campos marcados." };
  }
  store ??= await createStoreForHost(link?.ok ? link.host : "loja-fisica.local");

  const key = link?.ok ? urlKey(link.url) : null;
  if (key && supabaseEnabled()) {
    const dup = await findDuplicateByKey(key);
    if (dup) return { fieldErrors: { url: `Essa oferta já foi publicada: ${dup.title}` }, error: "Oferta repetida." };
  }

  const deal = await createDeal({
    authorId: profile.id,
    title: d.title,
    description: d.description ?? "",
    storeId: store.id,
    categoryId: d.categoryId || null,
    urlSubmitted: link?.ok ? link.url.toString() : null, // exatamente como colado: a tag de afiliado do autor é mantida
    urlKey: key,
    priceCents,
    listPriceCents,
    couponCode,
    couponKind,
    couponPercent,
    couponAmountCents,
    startsAt,
    expiresAt,
    availability: d.availability,
    shippingCents,
    shipsFrom: d.shipsFrom || null,
    publish: isStaff || profile.trusted,
  });

  if (supabaseEnabled()) {
    try {
      await saveDealImages(deal.id, images);
    } catch (e) {
      console.error("[publish] imagens", e);
    }
    if (deal.status === "published") await notifyPublished(deal.id);
  }
  redirect(`/oferta/${deal.slug}?enviada=1`);
}

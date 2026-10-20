"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { countDealsByAuthorSince, createDeal, createStoreForHost, getProfile, listStores } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { parsePriceToCents } from "@/lib/format";
import { checkSubmittedUrl, findStoreForHost } from "@/lib/links";

export type DealFormState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | undefined;

const MAX_PER_DAY_NEW = 5;
const MAX_PER_DAY_TRUSTED = 30;

const schema = z.object({
  url: z.string().trim().min(1, "Cole o link da oferta."),
  title: z.string().trim().min(10, "O título precisa ter pelo menos 10 caracteres.").max(140, "Máximo de 140 caracteres."),
  price: z.string().trim().optional(),
  listPrice: z.string().trim().optional(),
  couponCode: z.string().trim().max(40).optional(),
  categoryId: z.string().trim().optional(),
  description: z.string().trim().max(3000, "Máximo de 3.000 caracteres.").optional(),
});

export async function submitDealAction(_prev: DealFormState, form: FormData): Promise<DealFormState> {
  const session = await getSession();
  if (!session) redirect("/entrar?next=/publicar");
  const profile = await getProfile(session.userId);
  if (!profile || profile.bannedAt) return { error: "Sua conta não pode publicar no momento." };

  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, values };
  }
  const data = parsed.data;

  const link = checkSubmittedUrl(data.url);
  if (!link.ok) return { fieldErrors: { url: link.reason }, values };

  const priceCents = data.price ? parsePriceToCents(data.price) : null;
  const listPriceCents = data.listPrice ? parsePriceToCents(data.listPrice) : null;
  const couponCode = data.couponCode ? data.couponCode.toUpperCase() : null;
  if (data.price && priceCents == null) return { fieldErrors: { price: "Preço inválido. Exemplo: 199,90" }, values };
  if (data.listPrice && listPriceCents == null) return { fieldErrors: { listPrice: "Preço inválido. Exemplo: 399,90" }, values };
  if (priceCents == null && !couponCode) return { fieldErrors: { price: "Informe o preço ou um código de cupom." }, values };
  if (priceCents != null && listPriceCents != null && listPriceCents <= priceCents) {
    return { fieldErrors: { listPrice: "O preço anterior precisa ser maior que o preço atual." }, values };
  }

  const isStaff = session.role === "admin" || session.role === "moderator" || session.role === "system";
  const limit = profile.trusted || isStaff ? MAX_PER_DAY_TRUSTED : MAX_PER_DAY_NEW;
  const since = new Date(Date.now() - 86400_000).toISOString();
  if ((await countDealsByAuthorSince(profile.id, since)) >= limit) {
    return { error: `Você atingiu o limite de ${limit} ofertas em 24 horas. Tente de novo mais tarde.`, values };
  }

  const stores = await listStores();
  let store = findStoreForHost(link.host, stores);
  if (store?.status === "blocked") return { fieldErrors: { url: "Não aceitamos ofertas desta loja." }, values };
  store ??= await createStoreForHost(link.host);

  // Link do autor salvo exatamente como colado (tag de afiliado dele preservada).
  const deal = await createDeal({
    authorId: profile.id,
    title: data.title,
    description: data.description ?? "",
    storeId: store.id,
    categoryId: data.categoryId || null,
    urlSubmitted: link.url.toString(),
    priceCents,
    listPriceCents,
    couponCode,
    publish: isStaff || profile.trusted,
  });

  redirect(`/oferta/${deal.slug}?enviada=1`);
}

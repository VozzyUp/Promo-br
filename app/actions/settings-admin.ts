"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_BF, DEFAULT_BRAND, deleteSetting, setSetting, type AdsSettings, type BfSettings, type BrandSettings } from "@/lib/data/settings";
import { LEGAL_SLUGS, type LegalSlug } from "@/lib/legal-defaults";

export type SettingState = { ok?: boolean; error?: string } | undefined;

const clean = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function saveBrandAction(_prev: SettingState, form: FormData): Promise<SettingState> {
  const s = await requireAdmin();
  const brand: BrandSettings = {
    siteName: clean(form, "siteName", 40) || DEFAULT_BRAND.siteName,
    description: clean(form, "description", 200) || DEFAULT_BRAND.description,
    commissionNotice: clean(form, "commissionNotice", 300) || DEFAULT_BRAND.commissionNotice,
  };
  const bf: BfSettings = {
    enabled: form.get("bfEnabled") === "on",
    title: clean(form, "bfTitle", 40) || DEFAULT_BF.title,
    text: clean(form, "bfText", 160) || DEFAULT_BF.text,
  };
  await setSetting("public.brand", brand, s.userId);
  await setSetting("public.bf", bf, s.userId);
  refreshAll();
  return { ok: true };
}

export async function saveAdsAction(_prev: SettingState, form: FormData): Promise<SettingState> {
  const s = await requireAdmin();
  const client = clean(form, "client", 40);
  const slot = clean(form, "slot", 20);
  if (client && !/^ca-pub-\d{10,20}$/.test(client)) return { error: "O ID do editor tem o formato ca-pub-0000000000000000." };
  if (slot && !/^\d{6,15}$/.test(slot)) return { error: "O ID do bloco de anúncio tem só números." };
  const ads: AdsSettings = { client, slot };
  await setSetting("public.ads", ads, s.userId);
  refreshAll();
  return { ok: true };
}

export async function saveLegalAction(_prev: SettingState, form: FormData): Promise<SettingState> {
  const s = await requireAdmin();
  const slug = clean(form, "slug", 40) as LegalSlug;
  if (!LEGAL_SLUGS.includes(slug)) return { error: "Página desconhecida." };
  if (form.get("intent") === "reset") {
    await deleteSetting(`legal.${slug}`);
    refreshAll();
    return { ok: true };
  }
  const body = String(form.get("body") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 30000);
  if (body.length < 20) return { error: "O texto está curto demais." };
  await setSetting(`legal.${slug}`, { body, updatedAt: new Date().toISOString() }, s.userId);
  refreshAll();
  return { ok: true };
}
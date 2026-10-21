// Publicar em passos: duplicata por chave de link e gravação das imagens da oferta (Supabase).
import "server-only";
import { EXTENSION, MIME, inspectImage } from "../image-check";
import { db } from "../supabase/db";
import { supabaseAdmin } from "../supabase/server";

export type DuplicateDeal = { slug: string; title: string; status: "pending" | "published" };

/** Oferta ativa (pendente ou publicada) com a mesma chave de link. */
export async function findDuplicateByKey(urlKey: string): Promise<DuplicateDeal | null> {
  const { data, error } = await db()
    .from("deals").select("slug, title, status").eq("url_key", urlKey).in("status", ["pending", "published"]).limit(1).maybeSingle();
  if (error) throw error;
  return (data as DuplicateDeal | null) ?? null;
}

/** Guarda as imagens (já conferidas) em deal-images/<oferta>/ e marca a primeira como principal. */
export async function saveDealImages(dealId: string, images: Uint8Array[]): Promise<void> {
  if (images.length === 0) return;
  const storage = supabaseAdmin().storage.from("deal-images");
  const rows: { deal_id: string; path: string; position: number }[] = [];
  for (let i = 0; i < images.length; i++) {
    const info = inspectImage(images[i]);
    if (!info) continue;
    const path = `${dealId}/${i + 1}-${Date.now().toString(36)}.${EXTENSION[info.type]}`;
    const { error } = await storage.upload(path, images[i], { contentType: MIME[info.type], upsert: false });
    if (error) throw error;
    rows.push({ deal_id: dealId, path, position: i });
  }
  if (rows.length === 0) return;
  const { error } = await db().from("deal_images").insert(rows);
  if (error) throw error;
  const { error: e2 } = await db().from("deals").update({ image_path: rows[0].path }).eq("id", dealId);
  if (e2) throw e2;
}

/** Endereços públicos das imagens da galeria, na ordem escolhida pelo autor. */
export async function listDealGallery(dealId: string): Promise<string[]> {
  const { data, error } = await db().from("deal_images").select("path").eq("deal_id", dealId).order("position");
  if (error) throw error;
  const storage = supabaseAdmin().storage.from("deal-images");
  return (data as { path: string }[]).map((r) => storage.getPublicUrl(r.path).data.publicUrl);
}

/** Avisa seguidores do autor e alertas quando a oferta já nasce publicada. Falha aqui não derruba o envio. */
export async function notifyPublished(dealId: string): Promise<void> {
  const { error } = await db().rpc("on_deal_published", { p_deal: dealId });
  if (error) console.error("[publish] on_deal_published", error);
}

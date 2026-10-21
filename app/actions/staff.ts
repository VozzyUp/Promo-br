"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireModerator } from "@/lib/auth";
import { moderateDeal } from "@/lib/data";
import { editDeal, getUserRole, logModeration, setDealBoost, setDealSponsored, setDealStatus, updateUser } from "@/lib/data/staff";
import { linkDealToProduct, unlinkDealProduct } from "@/lib/data/verification";
import { normalizeGtin } from "@/lib/ean";
import { canActOn } from "@/lib/staff-rules";

const BOOST_HOURS = [6, 12, 24, 48, 72];
const UUID = /^[0-9a-f-]{36}$/i;
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

function refresh() {
  revalidatePath("/painel");
  revalidatePath("/painel/ofertas");
  revalidatePath("/");
}

/** Aprova ou recusa várias ofertas da fila de uma vez. */
export async function batchModerateAction(form: FormData) {
  const s = await requireModerator();
  const action = form.get("action") === "approve" ? "approve" : "reject";
  const reason = text(form, "reason", 300) || null;
  const ids = form.getAll("ids").map(String).filter((i) => UUID.test(i)).slice(0, 100);
  for (const id of ids) await moderateDeal(id, action, reason, s.userId);
  refresh();
}

export type DealEditState = { ok?: boolean; error?: string } | undefined;

export async function editDealAction(_prev: DealEditState, form: FormData): Promise<DealEditState> {
  const s = await requireModerator();
  const id = text(form, "id", 40);
  if (!UUID.test(id)) return { error: "Oferta inválida." };
  const title = text(form, "title", 140);
  if (title.length < 10) return { error: "O título precisa ter ao menos 10 caracteres." };
  const cat = text(form, "categoryId", 40);
  const eanRaw = text(form, "ean", 20);
  const ean = eanRaw ? normalizeGtin(eanRaw) : null;
  if (eanRaw && !ean) return { error: "Código de barras inválido. Use 8, 12, 13 ou 14 dígitos com o dígito verificador correto." };
  await editDeal(id, { title, categoryId: UUID.test(cat) ? cat : null });
  if (ean) {
    if (!(await linkDealToProduct(id, ean, title))) return { error: "Esta oferta não tem anúncio vinculado (precisa de link e preço) para ligar a um produto." };
  } else {
    await unlinkDealProduct(id);
  }
  await logModeration(s.userId, "deal", id, "edit", null);
  refresh();
  return { ok: true };
}

/** Ações rápidas numa oferta: expirar, remover, republicar, destacar (6 a 72 horas), tirar o destaque e marcar como patrocinada. */
export async function dealStaffAction(form: FormData) {
  const s = await requireModerator();
  const id = text(form, "id", 40);
  if (!UUID.test(id)) return;
  const act = text(form, "act", 20);
  const reason = text(form, "reason", 300) || null;
  if (act === "expire") await setDealStatus(id, "expired", reason);
  else if (act === "remove") await setDealStatus(id, "removed", reason);
  else if (act === "republish") await setDealStatus(id, "published", null);
  else if (act === "boost") {
    const hours = Number(text(form, "hours", 4));
    if (!BOOST_HOURS.includes(hours)) return;
    await setDealBoost(id, hours);
  } else if (act === "sponsor" || act === "unsponsor") await setDealSponsored(id, act === "sponsor");
  else if (act === "unboost") await setDealBoost(id, null);
  else return;
  await logModeration(s.userId, "deal", id, act, reason);
  refresh();
}

export async function userStaffAction(form: FormData) {
  const id = text(form, "id", 40);
  if (!UUID.test(id)) return;
  const act = text(form, "act", 20);
  if (act === "role") {
    const s = await requireAdmin();
    const role = text(form, "role", 12);
    if (role !== "user" && role !== "moderator" && role !== "admin") return;
    if (id === s.userId) return; // ninguém muda o próprio papel
    const target = await getUserRole(id);
    if (!target || !canActOn("admin", target)) return;
    await updateUser(id, { role });
    await logModeration(s.userId, "user", id, `role:${role}`, null);
  } else {
    const s = await requireModerator();
    if (id === s.userId) return;
    const target = await getUserRole(id);
    if (!target || !canActOn(s.role, target)) return; // moderador não mexe em equipe
    if (act === "trust" || act === "untrust") {
      await updateUser(id, { trusted: act === "trust" });
      await logModeration(s.userId, "user", id, act, null);
    } else if (act === "ban") {
      const reason = text(form, "reason", 300) || "sem motivo informado";
      await updateUser(id, { banned: true, banReason: reason });
      await logModeration(s.userId, "user", id, "ban", reason);
    } else if (act === "unban") {
      await updateUser(id, { banned: false });
      await logModeration(s.userId, "user", id, "unban", null);
    }
  }
  revalidatePath("/painel/usuarios");
}
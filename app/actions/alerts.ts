"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAlert, removeAlert, setAlertActive } from "@/lib/data/alerts";
import { parsePriceToCents } from "@/lib/format";

export type AlertState = { error?: string; ok?: boolean } | undefined;

const schema = z.object({
  keyword: z.string().trim().min(2, "Digite pelo menos 2 letras.").max(60, "Máximo de 60 caracteres."),
  maxPrice: z.string().trim().optional(),
  categoryId: z.union([z.string().uuid(), z.literal("")]).optional(),
});

export async function createAlertAction(_prev: AlertState, form: FormData): Promise<AlertState> {
  const session = await getSession();
  if (!session) return { error: "Entre na sua conta para criar alertas." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Alerta inválido." };
  const { keyword, maxPrice, categoryId } = parsed.data;

  let maxPriceCents: number | null = null;
  if (maxPrice) {
    maxPriceCents = parsePriceToCents(maxPrice);
    if (maxPriceCents == null) return { error: "Preço máximo inválido. Exemplo: 1500,00" };
  }
  try {
    const result = await createAlert({ userId: session.userId, keyword, maxPriceCents, categoryId: categoryId || null });
    if ("error" in result) return { error: result.error };
  } catch (e) {
    console.error("[alert]", e);
    return { error: "Não foi possível criar o alerta agora." };
  }
  revalidatePath("/alertas");
  return { ok: true };
}

const uuid = z.string().uuid();

export async function removeAlertFormAction(form: FormData): Promise<void> {
  const session = await getSession();
  const id = String(form.get("id") ?? "");
  if (!session || !uuid.safeParse(id).success) return;
  await removeAlert(id, session.userId);
  revalidatePath("/alertas");
}

export async function toggleAlertFormAction(form: FormData): Promise<void> {
  const session = await getSession();
  const id = String(form.get("id") ?? "");
  if (!session || !uuid.safeParse(id).success) return;
  await setAlertActive(id, session.userId, form.get("active") === "true");
  revalidatePath("/alertas");
}

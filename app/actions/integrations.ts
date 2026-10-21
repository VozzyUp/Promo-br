"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveIntegration, testIntegration } from "@/lib/data/integrations";
import { integrationDef, type IntegrationKey } from "@/lib/integrations-def";

export type IntegrationState = { ok?: boolean; message?: string } | undefined;

/** Um só formulário: "Salvar" grava as credenciais; "Salvar e testar" grava e confere com o serviço. */
export async function integrationAction(_prev: IntegrationState, form: FormData): Promise<IntegrationState> {
  await requireAdmin();
  const key = String(form.get("key") ?? "");
  const def = integrationDef(key);
  if (!def) return { ok: false, message: "Integração desconhecida." };
  const input: Record<string, string> = {};
  for (const f of def.fields) input[f.name] = String(form.get(f.name) ?? "").slice(0, 500);
  const enabled = form.get("enabled") === "on";
  try {
    await saveIntegration(key as IntegrationKey, enabled, input);
    revalidatePath("/painel/integracoes");
    if (form.get("intent") !== "test") return { ok: true, message: "Salvo." };
    const r = await testIntegration(key as IntegrationKey);
    revalidatePath("/painel/integracoes");
    return r;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { runJob } from "@/lib/jobs/runner";

export type RunNowState = { message?: string } | undefined;

export async function runNowAction(_prev: RunNowState, form: FormData): Promise<RunNowState> {
  await requireAdmin();
  const job = String(form.get("job") ?? "");
  if (!/^(expire|recheck|dispatch|newsletter|sync:shopee|robot:[0-9a-f-]{36})$/.test(job)) return { message: "Job inválido." };
  const r = await runJob(job, "manual");
  revalidatePath("/painel/execucoes");
  return { message: r.status === "ok" || r.status === "partial" ? `Terminou: ${JSON.stringify(r.stats)}` : `${r.status}: ${r.error ?? ""}` };
}
"use server";

import { revalidatePath } from "next/cache";
import { moderateDeal } from "@/lib/data";
import { requireModerator } from "@/lib/auth";

export async function moderateDealAction(form: FormData) {
  const session = await requireModerator();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const action = form.get("action") === "approve" ? "approve" : "reject";
  const reason = String(form.get("reason") ?? "").trim().slice(0, 300) || null;
  await moderateDeal(id, action, reason, session.userId);
  revalidatePath("/painel");
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { moderateDeal } from "@/lib/data";
import { requireModerator } from "@/lib/auth";

export async function moderateDealAction(form: FormData) {
  await requireModerator();
  const id = String(form.get("id") ?? "");
  const action = form.get("action") === "approve" ? "approve" : "reject";
  const reason = String(form.get("reason") ?? "").trim() || null;
  await moderateDeal(id, action, reason);
  revalidatePath("/painel");
  revalidatePath("/");
}

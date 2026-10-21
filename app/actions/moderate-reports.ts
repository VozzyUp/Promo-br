"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModerator } from "@/lib/auth";
import { resolveReports } from "@/lib/data/moderation";

const uuid = z.string().uuid();

/** Equipe resolve as denúncias de uma oferta ou comentário: ignorar, ou tirar do ar. */
export async function resolveReportsAction(form: FormData): Promise<void> {
  const session = await requireModerator();
  const id = String(form.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;
  const type = form.get("type") === "comment" ? "comment" : "deal";
  const outcome = form.get("outcome") === "remove" ? "remove" : "dismiss";
  await resolveReports({ type, targetId: id, staffId: session.userId, outcome });
  revalidatePath("/painel/denuncias");
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { vote } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { syncBadges } from "@/lib/data/gamification";

export async function voteAction(dealId: string, value: -1 | 1) {
  const session = await getSession();
  if (!session) return { error: "login" as const };
  if ((value !== 1 && value !== -1) || !/^[0-9a-f-]{36}$/i.test(dealId)) return { error: "invalid" as const };
  const result = await vote(dealId, session.userId, value);
  if (!result) return { error: "not_found" as const };
  try {
    await syncBadges(session.userId); // medalhas de votos; nunca atrapalha o voto
  } catch (e) {
    console.error("[badges]", e);
  }
  revalidatePath("/");
  return result;
}

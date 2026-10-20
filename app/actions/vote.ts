"use server";

import { revalidatePath } from "next/cache";
import { vote } from "@/lib/data";
import { getSession } from "@/lib/auth";

export async function voteAction(dealId: string, value: -1 | 1) {
  const session = await getSession();
  if (!session) return { error: "login" as const };
  if (value !== 1 && value !== -1) return { error: "invalid" as const };
  const result = await vote(dealId, session.userId, value);
  if (!result) return { error: "not_found" as const };
  revalidatePath("/");
  return result;
}

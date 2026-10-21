"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { countDiscussionsSince, createDiscussion, removeDiscussion } from "@/lib/data/discussions";
import { DISCUSSION_KINDS } from "@/lib/discussions";

export type DiscussionState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | undefined;

const schema = z.object({
  title: z.string().trim().min(10, "O título precisa ter pelo menos 10 caracteres.").max(140, "Máximo de 140 caracteres."),
  kind: z.enum(DISCUSSION_KINDS.map((k) => k.id) as [string, ...string[]], { message: "Escolha o tipo da discussão." }),
  categoryId: z.union([z.string().uuid(), z.literal("")]).optional(),
  body: z.string().trim().max(5000, "Máximo de 5.000 caracteres.").optional(),
});

const PER_DAY_NEW = 3;
const PER_DAY_TRUSTED = 15;

export async function submitDiscussionAction(_prev: DiscussionState, form: FormData): Promise<DiscussionState> {
  const session = await getSession();
  if (!session) redirect("/entrar?next=/publicar/discussao");
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, values };
  }
  const profile = await getProfile(session.userId);
  const trusted = !!profile?.trusted || session.role !== "user";
  const limit = trusted ? PER_DAY_TRUSTED : PER_DAY_NEW;
  if ((await countDiscussionsSince(session.userId, new Date(Date.now() - 86400_000).toISOString())) >= limit) {
    return { error: `Você atingiu o limite de ${limit} discussões em 24 horas.`, values };
  }
  let slug: string;
  try {
    ({ slug } = await createDiscussion({
      authorId: session.userId, title: parsed.data.title, body: parsed.data.body ?? "",
      kind: parsed.data.kind as (typeof DISCUSSION_KINDS)[number]["id"], categoryId: parsed.data.categoryId || null,
    }));
  } catch (e) {
    console.error("[discussion]", e);
    return { error: "Não foi possível publicar agora. Tente de novo.", values };
  }
  revalidatePath("/discussoes");
  redirect(`/discussoes/${slug}`);
}

export async function removeDiscussionFormAction(form: FormData): Promise<void> {
  const session = await getSession();
  const id = String(form.get("id") ?? "");
  if (!session || !z.string().uuid().safeParse(id).success) return;
  const ok = await removeDiscussion(id, { id: session.userId, role: session.role });
  if (ok) {
    revalidatePath("/discussoes");
    redirect("/discussoes");
  }
}

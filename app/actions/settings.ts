"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getPrefs, savePrefs } from "@/lib/data/social";
import { HOME_TABS, NOTIFY_GROUPS, type NotifyKind } from "@/lib/prefs";

export type SettingsState = { error?: string; ok?: boolean } | undefined;

const on = (form: FormData, name: string) => form.get(name) === "on";

/** Cada formulário da tela de ajustes envia só a sua seção; o resto das preferências fica como está. */
export async function savePrefsAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const session = await getSession();
  if (!session) return { error: "Entre na sua conta." };
  const section = String(form.get("section") ?? "");
  try {
    const prefs = await getPrefs(session.userId);
    if (section === "notify") {
      const kinds = NOTIFY_GROUPS.flatMap((g) => g.items.map((i) => i.kind));
      prefs.notify = Object.fromEntries(kinds.map((k) => [k, on(form, `n_${k}`)])) as Partial<Record<NotifyKind, boolean>>;
    } else if (section === "feed") {
      const tab = HOME_TABS.find((t) => t.id === form.get("home_tab"))?.id;
      if (tab) prefs.home_tab = tab;
      prefs.infinite_scroll = on(form, "infinite_scroll");
      prefs.auto_subscribe = on(form, "auto_subscribe");
      prefs.widgets = { hot: on(form, "w_hot"), categories: on(form, "w_categories"), coupons: on(form, "w_coupons"), discussions: on(form, "w_discussions") };
    } else if (section === "privacy") {
      prefs.allow_follow = on(form, "allow_follow");
      prefs.allow_messages = on(form, "allow_messages");
    } else {
      return { error: "Formulário inválido." };
    }
    await savePrefs(session.userId, prefs);
  } catch (e) {
    console.error("[settings]", e);
    return { error: "Não foi possível salvar agora. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

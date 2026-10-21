// Painel: lojas (modelo de link, política do link do usuário, status) e domínios bloqueados. Só Supabase.
import "server-only";
import { db } from "../supabase/db";

export const LINK_MODES = ["direct", "direct_program", "network", "monetizer"] as const;
export const USER_LINK_POLICIES = ["keep_author", "split", "replace", "by_reputation"] as const;
export const STORE_STATUSES = ["active", "pending_review", "blocked"] as const;

export type AdminStore = {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  logoUrl: string | null;
  status: (typeof STORE_STATUSES)[number];
  linkMode: (typeof LINK_MODES)[number];
  userLinkPolicy: (typeof USER_LINK_POLICIES)[number];
  splitOwnerPct: number;
  affiliateTemplate: string | null;
  deals: number;
};

type Row = {
  id: string; name: string; slug: string; domains: string[]; logo_url: string | null; status: AdminStore["status"];
  link_mode: AdminStore["linkMode"]; user_link_policy: AdminStore["userLinkPolicy"]; split_owner_pct: number; affiliate_template: string | null;
};

/** Todas as lojas, as que esperam revisão primeiro, com o total de ofertas de cada uma. */
export async function listAdminStores(): Promise<AdminStore[]> {
  const [stores, counts] = await Promise.all([
    db().from("stores")
      .select("id, name, slug, domains, logo_url, status, link_mode, user_link_policy, split_owner_pct, affiliate_template").order("name"),
    db().from("deals").select("store_id").limit(20000),
  ]);
  if (stores.error) throw stores.error;
  const perStore = new Map<string, number>();
  for (const r of (counts.data ?? []) as { store_id: string }[]) perStore.set(r.store_id, (perStore.get(r.store_id) ?? 0) + 1);
  const list = (stores.data as Row[]).map((r): AdminStore => ({
    id: r.id, name: r.name, slug: r.slug, domains: r.domains, logoUrl: r.logo_url, status: r.status, linkMode: r.link_mode,
    userLinkPolicy: r.user_link_policy, splitOwnerPct: r.split_owner_pct, affiliateTemplate: r.affiliate_template, deals: perStore.get(r.id) ?? 0,
  }));
  const rank = (s: AdminStore) => (s.status === "pending_review" ? 0 : s.status === "active" ? 1 : 2);
  return list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "pt-BR"));
}

export type StorePatch = {
  name: string; status: AdminStore["status"]; domains: string[]; logoUrl: string | null; linkMode: AdminStore["linkMode"];
  userLinkPolicy: AdminStore["userLinkPolicy"]; splitOwnerPct: number; affiliateTemplate: string | null;
};

export async function updateStore(id: string, p: StorePatch): Promise<void> {
  const { error } = await db().from("stores").update({
    name: p.name, status: p.status, domains: p.domains, logo_url: p.logoUrl, link_mode: p.linkMode,
    user_link_policy: p.userLinkPolicy, split_owner_pct: p.splitOwnerPct, affiliate_template: p.affiliateTemplate,
  }).eq("id", id);
  if (error) throw error;
}

export type BlockedDomain = { domain: string; reason: string; createdAt: string };

export async function listBlockedDomains(): Promise<BlockedDomain[]> {
  const { data, error } = await db().from("blocked_domains").select("domain, reason, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as { domain: string; reason: string; created_at: string }[]).map((r) => ({ domain: r.domain, reason: r.reason, createdAt: r.created_at }));
}

export async function addBlockedDomain(domain: string, reason: string): Promise<void> {
  const { error } = await db().from("blocked_domains").upsert({ domain, reason }, { onConflict: "domain" });
  if (error) throw error;
}

export async function removeBlockedDomain(domain: string): Promise<void> {
  const { error } = await db().from("blocked_domains").delete().eq("domain", domain);
  if (error) throw error;
}

/** O endereço (ou um domínio acima dele, como o de uma subpágina) está na lista de bloqueados? */
export async function isHostBlocked(host: string): Promise<boolean> {
  const { data, error } = await db().from("blocked_domains").select("domain");
  if (error) throw error;
  const h = host.toLowerCase();
  return (data as { domain: string }[]).some((r) => h === r.domain || h.endsWith(`.${r.domain}`));
}

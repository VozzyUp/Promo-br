// Fila de denúncias do painel da equipe (Supabase).
import "server-only";
import { db } from "../supabase/db";

export type ReportItem = { kind: string; note: string | null; by: string | null; at: string };
export type ReportGroup = {
  type: "deal" | "comment";
  targetId: string;
  title: string;
  excerpt: string | null;
  href: string | null;
  status: string;
  author: string | null;
  reports: ReportItem[];
};

type Row = {
  id: string; kind: string; note: string | null; created_at: string; deal_id: string | null; comment_id: string | null;
  reporter: { username: string } | null;
  deal: { id: string; slug: string; title: string; status: string; author: { username: string } | null } | null;
  comment: {
    id: string; body: string; status: string; author: { username: string } | null; deal: { slug: string; title: string } | null;
  } | null;
};

const COLS =
  "id, kind, note, created_at, deal_id, comment_id, reporter:profiles!reports_reporter_id_fkey(username), " +
  "deal:deals!reports_deal_id_fkey(id, slug, title, status, author:profiles!deals_author_id_fkey(username)), " +
  "comment:comments!reports_comment_id_fkey(id, body, status, author:profiles!comments_user_id_fkey(username), deal:deals!comments_deal_id_fkey(slug, title))";

export async function listOpenReports(): Promise<ReportGroup[]> {
  const { data, error } = await db()
    .from("reports").select(COLS).is("resolved_at", null).order("created_at", { ascending: true }).limit(300);
  if (error) throw error;
  const groups = new Map<string, ReportGroup>();
  for (const r of data as unknown as Row[]) {
    const item: ReportItem = { kind: r.kind, note: r.note, by: r.reporter?.username ?? null, at: r.created_at };
    if (r.deal && r.deal_id) {
      const g = groups.get(r.deal_id) ?? {
        type: "deal" as const, targetId: r.deal_id, title: r.deal.title, excerpt: null, href: `/oferta/${r.deal.slug}`,
        status: r.deal.status, author: r.deal.author?.username ?? null, reports: [],
      };
      g.reports.push(item);
      groups.set(r.deal_id, g);
    } else if (r.comment && r.comment_id) {
      const g = groups.get(r.comment_id) ?? {
        type: "comment" as const, targetId: r.comment_id, title: r.comment.deal?.title ?? "Comentário",
        excerpt: r.comment.body.slice(0, 300), href: r.comment.deal ? `/oferta/${r.comment.deal.slug}#c-${r.comment.id}` : null,
        status: r.comment.status, author: r.comment.author?.username ?? null, reports: [],
      };
      g.reports.push(item);
      groups.set(r.comment_id, g);
    }
  }
  return [...groups.values()];
}

export async function countOpenReports() {
  const { count, error } = await db().from("reports").select("id", { count: "exact", head: true }).is("resolved_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** Fecha as denúncias abertas de um alvo. "remove" também tira o alvo do ar; "dismiss" devolve o comentário escondido. */
export async function resolveReports(input: { type: "deal" | "comment"; targetId: string; staffId: string; outcome: "dismiss" | "remove" }) {
  const column = input.type === "deal" ? "deal_id" : "comment_id";
  const now = new Date().toISOString();
  const { error } = await db()
    .from("reports").update({ resolved_at: now, resolved_by: input.staffId }).eq(column, input.targetId).is("resolved_at", null);
  if (error) throw error;

  if (input.outcome === "remove") {
    const table = input.type === "deal" ? "deals" : "comments";
    const { error: e2 } = await db().from(table).update({ status: "removed" }).eq("id", input.targetId);
    if (e2) throw e2;
  } else if (input.type === "comment") {
    await db().from("comments").update({ status: "visible" }).eq("id", input.targetId).eq("status", "hidden");
  }
  await db().from("moderation_actions").insert({
    moderator_id: input.staffId, target_type: input.type, target_id: input.targetId,
    action: input.outcome === "remove" ? "remove_after_report" : "dismiss_reports", reason: null,
  });
}

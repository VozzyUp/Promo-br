// Lista dos jobs que o agendador e o botão "rodar agora" conhecem.
import "server-only";
import { expireDueDeals, recheckPublishedDeals } from "../data/verification";
import { runDispatch } from "../dispatch/run";
import { runShopeeRule } from "../robot/shopee";
import { syncShopeeConversions } from "./shopee-sync";
import { db } from "../supabase/db";

export type JobResult = { stats: Record<string, unknown>; partial?: boolean };
export type JobFn = () => Promise<JobResult>;

export const JOBS: Record<string, JobFn> = {
  expire: async () => ({ stats: { expired: await expireDueDeals() } }),
  cleanup: async () => {
    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
    const runs = await db().from("job_runs").delete({ count: "exact" }).lt("started_at", cutoff);
    const sent = await db().from("dispatches").delete({ count: "exact" }).in("status", ["sent", "skipped", "failed"]).lt("created_at", cutoff);
    return { stats: { runs: runs.count ?? 0, dispatches: sent.count ?? 0 } };
  },
  dispatch: async () => {
    const s = await runDispatch();
    return { stats: { ...s }, partial: s.failed > 0 && s.sent > 0 };
  },
  "sync:shopee": async () => ({ stats: { ...(await syncShopeeConversions()) } }),
  recheck: async () => {
    const s = await recheckPublishedDeals();
    return { stats: { ...s }, partial: s.failed > 0 && s.updated > 0 };
  },
};

/** Um job por regra do robô: robot:<id>. Preenchido pelo módulo do robô. */
export async function robotRuleJobs(): Promise<Record<string, JobFn>> {
  const { data } = await db().from("robot_rules").select("id");
  const out: Record<string, JobFn> = {};
  for (const r of (data ?? []) as { id: string }[]) out[`robot:${r.id}`] = async () => {
    const s = await runShopeeRule(r.id);
    return { stats: { ...s }, partial: s.errors > 0 && s.created > 0 };
  };
  return out;
}
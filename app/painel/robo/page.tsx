import { deleteRuleAction } from "@/app/actions/robot";
import { NEW_RULE, RuleForm, type RuleValues } from "@/components/admin/rule-form";
import { RunNow } from "@/components/admin/run-now";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { db } from "@/lib/supabase/db";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: robô de captação" };
export const dynamic = "force-dynamic";

type Row = {
  id: string; name: string; cron: string; keywords: string[]; min_discount_bp: number; min_commission_bp: number; max_price_cents: number | null;
  per_run: number; active: boolean; auto_publish: boolean; category_id: string | null; last_run_at: string | null;
};

export default async function PanelRobotPage() {
  await requireAdmin();
  if (!supabaseEnabled()) return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Precisa do Supabase configurado.</p>;
  const [rules, categories] = await Promise.all([db().from("robot_rules").select("*").order("created_at"), listCategories()]);
  const toValues = (r: Row): RuleValues => ({
    id: r.id, name: r.name, cron: r.cron, keywords: r.keywords.join("\n"), minDiscountPct: r.min_discount_bp / 100, minCommissionPct: r.min_commission_bp / 100,
    maxPrice: r.max_price_cents != null ? String(r.max_price_cents / 100).replace(".", ",") : "", perRun: r.per_run, active: r.active, autoPublish: r.auto_publish, categoryId: r.category_id ?? "",
  });
  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">Robô de captação (Shopee)</h1>
        <p className="text-sm text-muted">
          Cada regra busca ofertas pela API de afiliados nos horários definidos. Sem “publicar direto”, tudo cai na fila. Ofertas com desconto inflado são recusadas sozinhas.
          Ligue a integração da Shopee em Integrações antes.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {((rules.data ?? []) as Row[]).map((r) => (
          <li key={r.id} className="rounded-card bg-bg p-4 shadow-card">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold">{r.name}</span>
                <span className={`rounded-pill px-2 py-0.5 text-xs font-bold ${r.active ? "bg-accent text-on-accent" : "bg-surface text-muted"}`}>{r.active ? "Ligada" : "Desligada"}</span>
                <span className="text-sm text-muted">{r.cron} · {r.auto_publish ? "publica direto" : "vai para a fila"} · última rodada {r.last_run_at ? timeAgo(r.last_run_at) : "nunca"}</span>
              </summary>
              <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                <RuleForm rule={toValues(r)} categories={categories} />
                <div className="flex flex-wrap items-center gap-4">
                  <RunNow job={`robot:${r.id}`} label="Rodar agora" />
                  <form action={deleteRuleAction}><input type="hidden" name="id" value={r.id} /><button className="h-9 rounded-pill px-3 text-sm font-bold text-danger hover:bg-surface">Apagar regra</button></form>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <section aria-labelledby="nova" className="rounded-card bg-bg p-4 shadow-card">
        <h2 id="nova" className="mb-3 text-title font-bold">Nova regra</h2>
        <RuleForm rule={NEW_RULE} categories={categories} />
      </section>
    </div>
  );
}
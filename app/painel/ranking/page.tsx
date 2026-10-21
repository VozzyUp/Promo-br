import { RankingForm } from "@/components/admin/settings-forms";
import { requireAdmin } from "@/lib/auth";
import { getRankWeights, rankingMigrated } from "@/lib/data/settings";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: ranking" };
export const dynamic = "force-dynamic";

export default async function PanelRankingPage() {
  await requireAdmin();
  if (!supabaseEnabled()) return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Precisa do Supabase configurado.</p>;
  const [weights, migrated] = await Promise.all([getRankWeights(), rankingMigrated()]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-bold">Ranking das ofertas quentes</h1>
      <p className="text-sm text-muted">
        A ordem da aba “Mais quentes” soma pontos de votos, cliques, desconto real e selo, e divide pelo tempo desde a publicação.
        Mudar os pesos muda a ordem na hora, sem republicar nada.
      </p>
      {migrated ? null : (
        <p role="alert" className="rounded-sm bg-info-soft p-3 text-sm text-info">
          O banco ainda usa os pesos fixos. Para estes valores valerem, rode no SQL Editor do Supabase o arquivo
          <code className="mx-1 font-mono">supabase/migrations/20261021000007_ranking_newsletter_oauth.sql</code>.
        </p>
      )}
      <RankingForm weights={weights} />
    </div>
  );
}
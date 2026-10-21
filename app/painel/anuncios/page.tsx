import { AdsForm } from "@/components/admin/settings-forms";
import { requireAdmin } from "@/lib/auth";
import { getAdsSettings, getSetting } from "@/lib/data/settings";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: anúncios" };
export const dynamic = "force-dynamic";

export default async function PanelAdsPage() {
  await requireAdmin();
  if (!supabaseEnabled()) return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Precisa do Supabase configurado.</p>;
  const stored = await getSetting<{ client?: string; slot?: string }>("public.ads", {});
  const ads = await getAdsSettings();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-bold">Anúncios</h1>
      <AdsForm ads={ads} fromEnv={!stored.client && !!ads.client} />
      <p className="text-sm text-muted">O arquivo <a href="/ads.txt" className="font-bold text-accent">/ads.txt</a> é montado sozinho a partir do ID do editor.</p>
    </div>
  );
}
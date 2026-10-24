import { BrandForm } from "@/components/admin/settings-forms";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_BF, getBrandSettings, getSetting, type BfSettings } from "@/lib/data/settings";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: aparência e SEO" };
export const dynamic = "force-dynamic";

export default async function PanelAppearancePage() {
  await requireAdmin();
  if (!supabaseEnabled()) return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Precisa do Supabase configurado.</p>;
  const [brand, bf] = await Promise.all([getBrandSettings(), getSetting<BfSettings>("public.bf", DEFAULT_BF)]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-bold">Aparência e SEO</h1>
      <BrandForm brand={brand} bf={bf} />
    </div>
  );
}

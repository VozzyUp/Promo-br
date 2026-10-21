import { LegalFromSettings } from "@/components/legal-from-settings";
import { LEGAL_DEFAULTS } from "@/lib/legal-defaults";

export const metadata = { title: LEGAL_DEFAULTS["conduta"].title, description: LEGAL_DEFAULTS["conduta"].description };
export const dynamic = "force-dynamic";

export default function CondutaPage() {
  return <LegalFromSettings slug="conduta" />;
}
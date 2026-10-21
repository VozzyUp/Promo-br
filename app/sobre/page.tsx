import { LegalFromSettings } from "@/components/legal-from-settings";
import { LEGAL_DEFAULTS } from "@/lib/legal-defaults";

export const metadata = { title: LEGAL_DEFAULTS["sobre"].title, description: LEGAL_DEFAULTS["sobre"].description };
export const dynamic = "force-dynamic";

export default function SobrePage() {
  return <LegalFromSettings slug="sobre" />;
}
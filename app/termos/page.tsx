import { LegalFromSettings } from "@/components/legal-from-settings";
import { LEGAL_DEFAULTS } from "@/lib/legal-defaults";

export const metadata = { title: LEGAL_DEFAULTS["termos"].title, description: LEGAL_DEFAULTS["termos"].description };
export const dynamic = "force-dynamic";

export default function TermosPage() {
  return <LegalFromSettings slug="termos" />;
}
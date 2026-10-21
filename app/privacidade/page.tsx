import { LegalFromSettings } from "@/components/legal-from-settings";
import { LEGAL_DEFAULTS } from "@/lib/legal-defaults";

export const metadata = { title: LEGAL_DEFAULTS["privacidade"].title, description: LEGAL_DEFAULTS["privacidade"].description };
export const dynamic = "force-dynamic";

export default function PrivacidadePage() {
  return <LegalFromSettings slug="privacidade" />;
}
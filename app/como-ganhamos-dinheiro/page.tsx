import { LegalFromSettings } from "@/components/legal-from-settings";
import { LEGAL_DEFAULTS } from "@/lib/legal-defaults";

export const metadata = { title: LEGAL_DEFAULTS["como-ganhamos-dinheiro"].title, description: LEGAL_DEFAULTS["como-ganhamos-dinheiro"].description };
export const dynamic = "force-dynamic";

export default function ComoGanhamosDinheiroPage() {
  return <LegalFromSettings slug="como-ganhamos-dinheiro" />;
}
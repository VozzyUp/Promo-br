"use server";

import { getSession } from "@/lib/auth";
import { buildUserPrompt, cleanSuggestion, SYSTEM_PROMPT, type AiField, type AiInput } from "@/lib/ai-text";
import { getIntegrationConfig } from "@/lib/data/integrations";
import { complete, type AnthropicConfig } from "@/lib/integrations/anthropic";
import { createLimiter } from "@/lib/rate-limit";

export type AiSuggestion = { text: string } | { error: string };

// Cada pedido custa dinheiro: limite por pessoa.
const perUser = createLimiter({ max: 20, windowMs: 60 * 60_000 });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function suggestTextAction(raw: Record<string, unknown>): Promise<AiSuggestion> {
  const session = await getSession();
  if (!session) return { error: "Entre na sua conta para usar a sugestão." };
  const field: AiField = raw.field === "description" ? "description" : "title";
  const input: AiInput = {
    field,
    title: str(raw.title, 200), description: str(raw.description, 5000), store: str(raw.store, 60),
    price: str(raw.price, 30), listPrice: str(raw.listPrice, 30), couponCode: str(raw.couponCode, 40),
    couponKind: str(raw.couponKind, 20), couponValue: str(raw.couponValue, 20),
  };
  if (field === "title" && input.title.trim().length < 3) return { error: "Escreva um título primeiro; a IA melhora o que você começou." };
  if (field === "description" && input.title.trim().length < 3) return { error: "Preencha o título antes de pedir a descrição." };
  const limited = perUser.hit(session.userId);
  if (!limited.ok) return { error: `Você já usou bastante a sugestão. Tente de novo em ${Math.ceil(limited.retryAfterSec / 60)} min.` };
  const cfg = await getIntegrationConfig<AnthropicConfig>("anthropic");
  if (!cfg) return { error: "A sugestão por IA não está disponível agora." };
  try {
    const out = await complete(cfg, { system: SYSTEM_PROMPT, user: buildUserPrompt(input), maxTokens: field === "title" ? 120 : 400 });
    const text = cleanSuggestion(field, out);
    return text ? { text } : { error: "Não saiu uma sugestão boa desta vez. Tente de novo ou escreva você mesmo." };
  } catch (e) {
    console.error("[ia] falha ao sugerir texto", e instanceof Error ? e.message : e);
    return { error: "Não conseguimos gerar a sugestão agora. Escreva você mesmo ou tente mais tarde." };
  }
}
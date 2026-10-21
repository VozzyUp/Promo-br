// Montagem das mensagens e regras de quem pode ser enviado a um canal. Sem rede, para poder testar.
import { formatPrice } from "../format";

export type DispatchDeal = {
  title: string; slug: string; code: string; storeName: string; priceCents: number | null; listPriceCents: number | null;
  couponCode: string | null; couponPercent: number | null; verdict: string; realDiscountBp: number | null;
};

export type ChannelRules = { min_verdict: "any" | "verified" | "good_price"; min_discount_bp: number };

export const DEFAULT_TEMPLATE = "🔥 *{titulo}*\n💰 {preco} {desconto}\n🏪 {loja}\n{cupom}\n{selo}\n👉 {link}";

/** Desconto que vale para filtrar: o real (do histórico) quando existe, senão o do preço anterior, senão o do cupom. */
export function effectiveDiscountBp(d: Pick<DispatchDeal, "priceCents" | "listPriceCents" | "realDiscountBp" | "couponPercent">): number {
  if (d.realDiscountBp != null) return d.realDiscountBp;
  if (d.priceCents != null && d.listPriceCents && d.listPriceCents > d.priceCents) return Math.round((1 - d.priceCents / d.listPriceCents) * 10000);
  if (d.priceCents == null && d.couponPercent) return d.couponPercent * 100;
  return 0;
}

export function dealMeetsChannel(d: DispatchDeal, c: ChannelRules): boolean {
  if (d.verdict === "inflated") return false;
  if (c.min_verdict === "verified" && d.verdict !== "verified") return false;
  if (c.min_verdict === "good_price" && d.verdict !== "verified" && d.verdict !== "good_price") return false;
  return effectiveDiscountBp(d) >= c.min_discount_bp;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Está dentro do horário de envio do canal (horário de Brasília)? Aceita janela que cruza a meia-noite. */
export function inSendWindow(now: Date, start: string, end: string): boolean {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour12: false, hour: "numeric", minute: "numeric" }).formatToParts(now);
  const cur = (Number(parts.find((p) => p.type === "hour")!.value) % 24) * 60 + Number(parts.find((p) => p.type === "minute")!.value);
  const s = toMinutes(start), e = toMinutes(end);
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SELO: Record<string, string> = { verified: "✅ Desconto verificado", good_price: "👍 Bom preço" };

/** *negrito* vira <b> no Telegram e fica *negrito* no WhatsApp. Linhas que ficam vazias somem. */
export function renderMessage(template: string, d: DispatchDeal, link: string, type: "telegram" | "whatsapp"): string {
  const disc = effectiveDiscountBp(d);
  const vars: Record<string, string> = {
    titulo: d.title,
    preco: d.priceCents != null ? formatPrice(d.priceCents) : d.couponPercent ? `${d.couponPercent}% de desconto` : "veja o cupom",
    de: d.listPriceCents ? formatPrice(d.listPriceCents) : "",
    desconto: disc >= 100 && d.priceCents != null ? `(-${Math.round(disc / 100)}%)` : "",
    loja: d.storeName,
    cupom: d.couponCode ? `🎟 Cupom: ${d.couponCode}` : "",
    selo: SELO[d.verdict] ?? "",
    link,
  };
  const lines = template.split("\n").map((line) => line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "").replace(/\s+$/g, ""));
  const body = lines.filter((l, i) => l.trim() !== "" || (lines[i + 1]?.trim() !== "" && i > 0 && lines[i - 1]?.trim() !== "")).join("\n").trim();
  if (type === "whatsapp") return body;
  return esc(body).replace(/\*([^*\n]+)\*/g, "<b>$1</b>");
}
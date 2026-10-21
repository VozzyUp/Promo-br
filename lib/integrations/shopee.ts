// Cliente da API aberta de afiliados da Shopee Brasil (GraphQL com assinatura SHA256).
// Os nomes dos campos seguem a documentação pública; se a Shopee mudar algum, o "Testar conexão" do painel mostra o erro.
import "server-only";
import { createHash } from "node:crypto";
import { parseConversion, parseOffer, type RawConversion, type RawOffer, type ShopeeConversion, type ShopeeOffer } from "./shopee-parse";

export { parseConversion, parseOffer };
export type { ShopeeConversion, ShopeeOffer };

// SHOPEE_API_URL só existe para os testes apontarem para um servidor de mentira.
const ENDPOINT = process.env.SHOPEE_API_URL ?? "https://open-api.affiliate.shopee.com.br/graphql";

export type ShopeeConfig = { appId: string; secret: string };

export class ShopeeError extends Error {}

async function gql<T>(cfg: ShopeeConfig, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const payload = JSON.stringify({ query, variables });
  const ts = Math.floor(Date.now() / 1000);
  const signature = createHash("sha256").update(`${cfg.appId}${ts}${payload}${cfg.secret}`).digest("hex");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `SHA256 Credential=${cfg.appId}, Timestamp=${ts}, Signature=${signature}` },
    body: payload,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as { data?: T; errors?: { message: string }[] } | null;
  if (!res.ok || !json) throw new ShopeeError(`Shopee respondeu ${res.status}.`);
  if (json.errors?.length) throw new ShopeeError(json.errors.map((e) => e.message).join("; ").slice(0, 300));
  if (!json.data) throw new ShopeeError("Resposta da Shopee sem dados.");
  return json.data;
}

const OFFER_FIELDS = "itemId productName commissionRate price priceMin priceDiscountRate sales ratingStar imageUrl shopName productLink offerLink";

/** sortType da Shopee: 1 relevância, 2 mais vendidos, 3 menor preço, 4 maior preço, 5 maior comissão. */
export async function searchOffers(cfg: ShopeeConfig, o: { keyword?: string; page?: number; limit?: number; sortType?: number }): Promise<ShopeeOffer[]> {
  const data = await gql<{ productOfferV2: { nodes: RawOffer[] } }>(
    cfg,
    `query($keyword: String, $page: Int, $limit: Int, $sortType: Int) {
      productOfferV2(keyword: $keyword, page: $page, limit: $limit, sortType: $sortType) { nodes { ${OFFER_FIELDS} } }
    }`,
    { keyword: o.keyword ?? "", page: o.page ?? 1, limit: o.limit ?? 20, sortType: o.sortType ?? 2 },
  );
  return data.productOfferV2.nodes.map(parseOffer).filter((x): x is ShopeeOffer => x !== null);
}

/** Link curto de afiliado com o nosso código no subId, para casar a venda com o clique. */
export async function shortLink(cfg: ShopeeConfig, originUrl: string, subId: string): Promise<string | null> {
  try {
    const data = await gql<{ generateShortLink: { shortLink: string } }>(
      cfg,
      `mutation($input: ShortLinkInput!) { generateShortLink(input: $input) { shortLink } }`,
      { input: { originUrl, subIds: [subId] } },
    );
    return data.generateShortLink.shortLink || null;
  } catch (e) {
    console.error("[shopee] shortLink", e);
    return null;
  }
}

/** Conversões do período (a Shopee limita a janela; o chamador usa janelas curtas). */
export async function conversionReport(cfg: ShopeeConfig, from: Date, to: Date): Promise<ShopeeConversion[]> {
  const out: ShopeeConversion[] = [];
  let scrollId: string | null = null;
  for (let i = 0; i < 20; i++) {
    const data: { conversionReport: { nodes: RawConversion[]; pageInfo?: { hasNextPage: boolean; scrollId?: string } } } = await gql(
      cfg,
      `query($start: Int, $end: Int, $scrollId: String) {
        conversionReport(purchaseTimeStart: $start, purchaseTimeEnd: $end, scrollId: $scrollId, limit: 100) {
          nodes { purchaseTime conversionId conversionStatus totalCommission utmContent orders { orderId items { actualAmount } } }
          pageInfo { hasNextPage scrollId }
        }
      }`,
      { start: Math.floor(from.getTime() / 1000), end: Math.floor(to.getTime() / 1000), scrollId },
    );
    out.push(...data.conversionReport.nodes.map(parseConversion));
    const pi: { hasNextPage: boolean; scrollId?: string } | undefined = data.conversionReport.pageInfo;
    if (!pi?.hasNextPage || !pi.scrollId) break;
    scrollId = pi.scrollId;
  }
  return out;
}
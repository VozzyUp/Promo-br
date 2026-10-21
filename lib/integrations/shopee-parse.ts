// Leitura (sem rede) das respostas da API de afiliados da Shopee.

export type ShopeeOffer = {
  itemId: string;
  title: string;
  priceCents: number;
  discountPct: number;
  commissionBp: number;
  sales: number;
  rating: number;
  imageUrl: string | null;
  shopName: string | null;
  productLink: string;
  offerLink: string;
};

export type RawOffer = {
  itemId: string | number; productName: string; commissionRate?: string; priceMin?: string; price?: string; priceDiscountRate?: number;
  sales?: number; ratingStar?: string; imageUrl?: string; shopName?: string; productLink?: string; offerLink?: string;
};

const toCents = (v: string | undefined) => (v ? Math.round(parseFloat(v) * 100) : NaN);

export function parseOffer(r: RawOffer): ShopeeOffer | null {
  const priceCents = toCents(r.priceMin ?? r.price);
  if (!r.productName || !Number.isFinite(priceCents) || priceCents <= 0 || !r.offerLink || !r.productLink) return null;
  return {
    itemId: String(r.itemId),
    title: r.productName.replace(/\s+/g, " ").trim(),
    priceCents,
    discountPct: r.priceDiscountRate ?? 0,
    commissionBp: Math.round((parseFloat(r.commissionRate ?? "0") || 0) * 10000),
    sales: r.sales ?? 0,
    rating: parseFloat(r.ratingStar ?? "0") || 0,
    imageUrl: r.imageUrl ?? null,
    shopName: r.shopName ?? null,
    productLink: r.productLink,
    offerLink: r.offerLink,
  };
}

export type ShopeeConversion = { orderRef: string; subId: string | null; saleCents: number; commissionCents: number; status: "pending" | "approved" | "cancelled" | "paid"; occurredAt: Date };

export type RawConversion = {
  purchaseTime: number; conversionId: string | number; conversionStatus?: string; totalCommission?: string; utmContent?: string;
  orders?: { orderId: string; items?: { actualAmount?: string }[] }[];
};

export function mapStatus(s: string | undefined): ShopeeConversion["status"] {
  const v = (s ?? "").toUpperCase();
  if (v.includes("CANCEL") || v.includes("INVALID")) return "cancelled";
  if (v.includes("COMPLETE") || v.includes("APPROV") || v.includes("PAID")) return "approved";
  return "pending";
}

export function parseConversion(r: RawConversion): ShopeeConversion {
  const sale = (r.orders ?? []).flatMap((o) => o.items ?? []).reduce((sum, i) => sum + (toCents(i.actualAmount) || 0), 0);
  return {
    orderRef: String(r.conversionId),
    subId: r.utmContent || null,
    saleCents: sale,
    commissionCents: toCents(r.totalCommission) || 0,
    status: mapStatus(r.conversionStatus),
    occurredAt: new Date(r.purchaseTime * 1000),
  };
}


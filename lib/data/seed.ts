// Dados de exemplo para a fatia vertical (camada falsa). Produtos e textos inventados.
import type { Category, Deal, Profile, Store } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const seedCategories: Category[] = [
  { id: "cat-eletronicos", name: "Eletrônicos", slug: "eletronicos" },
  { id: "cat-casa", name: "Casa e cozinha", slug: "casa-e-cozinha" },
  { id: "cat-games", name: "Games", slug: "games" },
  { id: "cat-moda", name: "Moda", slug: "moda" },
  { id: "cat-mercado", name: "Mercado", slug: "mercado" },
  { id: "cat-beleza", name: "Beleza e saúde", slug: "beleza-e-saude" },
  { id: "cat-viagem", name: "Viagem", slug: "viagem" },
  { id: "cat-outros", name: "Outros", slug: "outros" },
];

export const seedStores: Store[] = [
  { id: "st-amazon", name: "Amazon", slug: "amazon", domains: ["amazon.com.br", "amzn.to"], status: "active" },
  { id: "st-mercadolivre", name: "Mercado Livre", slug: "mercado-livre", domains: ["mercadolivre.com.br", "mercadolivre.com", "meli.la"], status: "active" },
  { id: "st-shopee", name: "Shopee", slug: "shopee", domains: ["shopee.com.br", "s.shopee.com.br"], status: "active" },
  { id: "st-magalu", name: "Magalu", slug: "magalu", domains: ["magazineluiza.com.br", "magalu.com"], status: "active" },
  { id: "st-kabum", name: "KaBuM!", slug: "kabum", domains: ["kabum.com.br"], status: "active" },
  { id: "st-casasbahia", name: "Casas Bahia", slug: "casas-bahia", domains: ["casasbahia.com.br"], status: "active" },
  { id: "st-aliexpress", name: "AliExpress", slug: "aliexpress", domains: ["aliexpress.com", "pt.aliexpress.com", "s.click.aliexpress.com"], status: "active" },
];

export const SYSTEM_USER_ID = "u-equipe";
export const ADMIN_USER_ID = "u-admin";

export const seedProfiles: Profile[] = [
  {
    id: SYSTEM_USER_ID, username: "equipe", displayName: "Equipe PromoValeu", avatarUrl: null, role: "system",
    reputation: 0, trusted: true, approvedPosts: 0, bannedAt: null, createdAt: hoursAgo(24 * 30),
  },
  {
    id: ADMIN_USER_ID, username: "admin", displayName: "Admin", avatarUrl: null, role: "admin",
    reputation: 0, trusted: true, approvedPosts: 0, bannedAt: null, createdAt: hoursAgo(24 * 30),
  },
  {
    id: "u-cacadora", username: "cacadora_de_preco", displayName: "Caçadora de preço", avatarUrl: null, role: "user",
    reputation: 120, trusted: true, approvedPosts: 14, bannedAt: null, createdAt: hoursAgo(24 * 20),
  },
];

/** E-mail do admin de teste; a senha vem de DEV_ADMIN_PASSWORD (.env.local). */
export const ADMIN_EMAIL = "admin@promo-br.test";

type SeedDeal = Omit<Deal, "id" | "code" | "slug" | "votesUp" | "votesDown" | "clicksTotal" | "commentsCount" | "createdAt"> & {
  hours: number; up: number; down: number; clicks: number;
};

const base = {
  source: "user" as const, rejectReason: null, expiresAt: null, imageUrl: null,
  couponCode: null, couponPercent: null, verdict: "pending" as const, realDiscountBp: null, status: "published" as const,
};

export const seedDeals: SeedDeal[] = [
  {
    ...base, title: "Fone Bluetooth com cancelamento de ruído, 40 h de bateria",
    description: "Menor preço que vi nos últimos meses. Frete grátis para quem tem assinatura.",
    authorId: "u-cacadora", storeId: "st-amazon", categoryId: "cat-eletronicos",
    urlSubmitted: "https://www.amazon.com.br/dp/EXEMPLO01", priceCents: 19990, listPriceCents: 39990,
    verdict: "verified", realDiscountBp: 3800, publishedAt: hoursAgo(2), hours: 2, up: 61, down: 3, clicks: 340,
  },
  {
    ...base, title: "Air fryer 5,5 L digital 1500 W",
    description: "Preço baixou de novo. Pagando no Pix sai ainda mais barato.",
    authorId: "u-cacadora", storeId: "st-magalu", categoryId: "cat-casa",
    urlSubmitted: "https://www.magazineluiza.com.br/exemplo/p/0001/", priceCents: 32900, listPriceCents: 54900,
    verdict: "good_price", realDiscountBp: 1200, publishedAt: hoursAgo(5), hours: 5, up: 40, down: 6, clicks: 210,
  },
  {
    ...base, title: "Cupom de 15% em jogos digitais selecionados",
    description: "Vale para a primeira compra da conta. Limite de um uso por pessoa.",
    authorId: SYSTEM_USER_ID, source: "admin", storeId: "st-aliexpress", categoryId: "cat-games",
    urlSubmitted: "https://pt.aliexpress.com/exemplo", priceCents: null, listPriceCents: null,
    couponCode: "JOGA15", couponPercent: 15, expiresAt: new Date(Date.now() + 3 * 86400_000).toISOString(),
    publishedAt: hoursAgo(8), hours: 8, up: 33, down: 2, clicks: 150,
  },
  {
    ...base, title: "SSD NVMe 1 TB leitura 5000 MB/s",
    description: "Bom para quem quer montar ou atualizar o PC antes da Black Friday.",
    authorId: "u-cacadora", storeId: "st-kabum", categoryId: "cat-eletronicos",
    urlSubmitted: "https://www.kabum.com.br/produto/exemplo", priceCents: 39999, listPriceCents: 59999,
    verdict: "verified", realDiscountBp: 2900, publishedAt: hoursAgo(12), hours: 12, up: 52, down: 4, clicks: 290,
  },
  {
    ...base, title: "Kit 12 rolos de papel toalha folha dupla",
    description: "Estoque de casa. Assinando e economizando fica mais barato.",
    authorId: "u-cacadora", storeId: "st-amazon", categoryId: "cat-mercado",
    urlSubmitted: "https://www.amazon.com.br/dp/EXEMPLO02", priceCents: 2790, listPriceCents: 4590,
    verdict: "no_comparison", publishedAt: hoursAgo(20), hours: 20, up: 18, down: 5, clicks: 80,
  },
  {
    ...base, title: "Tênis de corrida masculino, várias numerações",
    description: "Algumas cores com preço ainda menor. Confira a tabela de medidas.",
    authorId: "u-cacadora", storeId: "st-mercadolivre", categoryId: "cat-moda",
    urlSubmitted: "https://www.mercadolivre.com.br/exemplo", priceCents: 18990, listPriceCents: 34990,
    verdict: "good_price", realDiscountBp: 900, publishedAt: hoursAgo(28), hours: 28, up: 25, down: 9, clicks: 120,
  },
  {
    ...base, title: "Smartwatch com GPS e monitor cardíaco",
    description: "Cupom da loja aplicado no carrinho.",
    authorId: "u-cacadora", storeId: "st-shopee", categoryId: "cat-eletronicos",
    urlSubmitted: "https://shopee.com.br/exemplo", priceCents: 14900, listPriceCents: 49900,
    verdict: "inflated", realDiscountBp: 300, status: "rejected", publishedAt: null,
    hours: 30, up: 0, down: 0, clicks: 0,
  },
];

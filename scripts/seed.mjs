// Dados de exemplo no Supabase (usuários de teste + ofertas inventadas). Idempotente: pode rodar de novo.
// Uso: node --env-file=.env.local scripts/seed.mjs
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY em .env.local");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const slugify = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

async function ensureUser({ email, password, username, displayName, role, trusted }) {
  const list = must(await db.auth.admin.listUsers({ page: 1, perPage: 1000 }));
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    user = must(
      await db.auth.admin.createUser({
        email,
        password: password ?? randomBytes(24).toString("base64url"),
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      }),
    ).user;
  } else if (password) {
    must(await db.auth.admin.updateUserById(user.id, { password }));
  }
  must(await db.from("profiles").update({ role, trusted }).eq("id", user.id).select("id"));
  return user.id;
}

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (!adminPassword || adminPassword.length < 8) throw new Error("Defina SEED_ADMIN_PASSWORD (8+ caracteres) em .env.local");

const equipe = await ensureUser({ email: "equipe@promo-br.test", username: "equipe", displayName: "Equipe PromoValeu", role: "system", trusted: true });
await ensureUser({ email: "admin@promo-br.test", password: adminPassword, username: "admin", displayName: "Admin", role: "admin", trusted: true });
const cacadora = await ensureUser({ email: "cacadora@promo-br.test", username: "cacadora_de_preco", displayName: "Caçadora de preço", role: "user", trusted: true });
// Usuário comum, ainda não confiável (as ofertas dele vão para a fila). Só existe se SEED_USER_PASSWORD estiver definido.
if (process.env.SEED_USER_PASSWORD) {
  await ensureUser({ email: "tester@promo-br.test", password: process.env.SEED_USER_PASSWORD, username: "tester", displayName: "Tester", role: "user", trusted: false });
}

const stores = Object.fromEntries(must(await db.from("stores").select("id, slug")).map((s) => [s.slug, s.id]));
const cats = Object.fromEntries(must(await db.from("categories").select("id, slug")).map((c) => [c.slug, c.id]));

const base = { source: "user", status: "published", verdict: "pending" };
const deals = [
  { ...base, title: "Fone Bluetooth com cancelamento de ruído, 40 h de bateria", description: "Menor preço que vi nos últimos meses. Frete grátis para quem tem assinatura.", author_id: cacadora, store: "amazon", cat: "eletronicos", url_submitted: "https://www.amazon.com.br/dp/EXEMPLO01", price_cents: 19990, list_price_cents: 39990, verdict: "verified", real_discount_bp: 3800, h: 2, clicks: 340 },
  { ...base, title: "Air fryer 5,5 L digital 1500 W", description: "Preço baixou de novo. Pagando no Pix sai ainda mais barato.", author_id: cacadora, store: "magalu", cat: "casa-e-cozinha", url_submitted: "https://www.magazineluiza.com.br/exemplo/p/0001/", price_cents: 32900, list_price_cents: 54900, verdict: "good_price", real_discount_bp: 1200, h: 5, clicks: 210 },
  { ...base, source: "admin", title: "Cupom de 15% em jogos digitais selecionados", description: "Vale para a primeira compra da conta. Limite de um uso por pessoa.", author_id: equipe, store: "aliexpress", cat: "games", url_submitted: "https://pt.aliexpress.com/exemplo", price_cents: null, list_price_cents: null, coupon_code: "JOGA15", coupon_percent: 15, expires_at: new Date(Date.now() + 3 * 86400_000).toISOString(), h: 8, clicks: 150 },
  { ...base, title: "SSD NVMe 1 TB leitura 5000 MB/s", description: "Bom para quem quer montar ou atualizar o PC antes da Black Friday.", author_id: cacadora, store: "kabum", cat: "eletronicos", url_submitted: "https://www.kabum.com.br/produto/exemplo", price_cents: 39999, list_price_cents: 59999, verdict: "verified", real_discount_bp: 2900, h: 12, clicks: 290 },
  { ...base, title: "Kit 12 rolos de papel toalha folha dupla", description: "Estoque de casa. Assinando e economizando fica mais barato.", author_id: cacadora, store: "amazon", cat: "mercado", url_submitted: "https://www.amazon.com.br/dp/EXEMPLO02", price_cents: 2790, list_price_cents: 4590, verdict: "no_comparison", h: 20, clicks: 80 },
  { ...base, title: "Tênis de corrida masculino, várias numerações", description: "Algumas cores com preço ainda menor. Confira a tabela de medidas.", author_id: cacadora, store: "mercado-livre", cat: "moda", url_submitted: "https://www.mercadolivre.com.br/exemplo", price_cents: 18990, list_price_cents: 34990, verdict: "good_price", real_discount_bp: 900, h: 28, clicks: 120 },
];

let created = 0;
for (const { store, cat, h, clicks, ...d } of deals) {
  const exists = must(await db.from("deals").select("id").eq("title", d.title).maybeSingle());
  if (exists) continue;
  const code = randomBytes(4).toString("hex");
  must(
    await db.from("deals").insert({
      ...d, code, slug: `${slugify(d.title)}-${code.slice(0, 4)}`, store_id: stores[store], category_id: cats[cat],
      published_at: hoursAgo(h), created_at: hoursAgo(h), clicks_total: clicks,
    }).select("id"),
  );
  created++;
}
console.log(`seed ok: 3 usuários de teste, ${created} ofertas novas (${deals.length - created} já existiam)`);

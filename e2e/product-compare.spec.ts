import { expect, test, type Page } from "@playwright/test";
import { adminLogin, login } from "./helpers";

// EAN só de teste (dígito verificador válido). O produto criado fica no banco: supabase/cleanup-testes.sql apaga.
const EAN = "4006381333931";

async function publishOffer(page: Page, title: string, path: string, price: string): Promise<string> {
  await page.goto("/publicar/oferta");
  await page.locator("#w-url").fill(`https://www.example.com/${path}`);
  await page.getByRole("button", { name: "Verificar link" }).click();
  await expect(page.getByText(/Nenhuma oferta repetida encontrada/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#w-title").fill(title);
  await page.locator("#w-price").fill(price);
  await page.locator("#w-cat").selectOption({ index: 1 });
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continuar" }).click(); // imagens, descrição, detalhes, revisão
  await page.getByRole("button", { name: "Publicar oferta" }).click();
  const limit = page.getByText(/atingiu o limite de \d+ publicações/);
  await Promise.race([page.waitForURL(/enviada=1/, { timeout: 30_000 }), limit.waitFor({ timeout: 30_000 })]).catch(() => undefined);
  test.skip(await limit.isVisible(), "limite diário de publicações da conta de teste já usado");
  await expect(page).toHaveURL(/\/oferta\/.+enviada=1/);
  return new URL(page.url()).pathname;
}

async function editEan(page: Page, title: string, value: string) {
  await page.goto(`/painel/ofertas?q=${encodeURIComponent(title)}`);
  const row = page.locator("main ul > li").filter({ hasText: title }).first();
  await row.locator("summary", { hasText: "Editar" }).click();
  await row.getByLabel("Código de barras").fill(value);
  await row.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(row.getByRole("status").last()).toHaveText(/Salvo\./, { timeout: 15_000 });
}

async function removeDeal(page: Page, title: string) {
  await page.goto(`/painel/ofertas?q=${encodeURIComponent(title)}`);
  const row = page.locator("main ul > li").filter({ hasText: title }).first();
  if (await row.count()) await row.getByRole("button", { name: "Remover" }).click();
}

test("P-1 mesmo produto em outras lojas: o EAN liga duas ofertas e a página mostra a comparação", async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD no .env.local");
  const stamp = Date.now().toString(36);
  const a = `[e2e] Produto EAN A ${stamp}`;
  const b = `[e2e] Produto EAN B ${stamp}`;
  await login(page, adminLogin);
  try {
    const pathA = await publishOffer(page, a, `ean-a-${stamp}`, "100,00");
    await publishOffer(page, b, `ean-b-${stamp}`, "120,00");
    // sem EAN ligado, não há comparação
    await page.goto(pathA);
    await expect(page.getByRole("heading", { name: "Este produto em outras lojas" })).toHaveCount(0);

    await editEan(page, a, EAN);
    await editEan(page, b, EAN);
    await page.goto(pathA);
    const block = page.locator("section", { has: page.getByRole("heading", { name: "Este produto em outras lojas" }) });
    await expect(block).toBeVisible();
    await expect(block.getByText("Esta oferta", { exact: true })).toBeVisible();
    await expect(block.getByText("Menor preço")).toBeVisible();
    await expect(block.getByText(/R\$\s?20,00 a mais que o menor/)).toBeVisible();

    // desligar o EAN de uma delas desfaz a comparação
    await editEan(page, b, "");
    await page.goto(pathA);
    await expect(page.getByRole("heading", { name: "Este produto em outras lojas" })).toHaveCount(0);
  } finally {
    await removeDeal(page, a);
    await removeDeal(page, b);
  }
});

test("P-2 EAN inválido é recusado com mensagem clara", async ({ page }) => {
  test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD no .env.local");
  await login(page, adminLogin);
  await page.goto("/painel/ofertas?status=published&tipo=oferta");
  const row = page.locator("main ul > li").first();
  await row.locator("summary", { hasText: "Editar" }).click();
  await row.getByLabel("Código de barras").fill("1234567890123");
  await row.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(row.getByText(/Código de barras inválido/)).toBeVisible();
});
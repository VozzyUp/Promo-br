import { expect, test, type Page } from "@playwright/test";
import { adminLogin, expectAccessible, login, userLogin, watch } from "./helpers";
import { makePng } from "./png";

// Estes testes gravam no banco (conta tester, sempre como pendente ou removido). Limite diário da conta: 5 ofertas e 3 discussões.
test.describe("fluxos com gravação", () => {
  test.skip(!userLogin.password, "sem SEED_USER_PASSWORD no .env.local");
  const stamp = Date.now().toString(36);

  /** Preenche o assistente de cupom até o passo das imagens. */
  async function fillCouponUntilImages(page: Page, title: string, path: string) {
    await page.goto("/publicar/cupom");
    await page.locator("#w-url").fill(`https://www.example.com/${path}`);
    await page.getByRole("button", { name: "Verificar link" }).click();
    await expect(page.getByText(/Nenhuma oferta repetida encontrada/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#w-title").fill(title);
    await page.locator("#w-ckind").selectOption({ index: 1 });
    await page.locator("#w-cval").fill("10");
    await page.locator("#w-code").fill("E2E10");
    await page.locator("#w-cat").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  test("D-1 discussão: criar, comentar e remover (conta admin: limite diário maior)", async ({ page }) => {
    const errors = watch(page);
    test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD");
    await login(page, adminLogin);
    await page.goto("/publicar/discussao");
    await page.getByLabel("Título", { exact: true }).fill(`[e2e] Discussão de teste automatizado ${stamp}`);
    await page.getByLabel("Tipo de discussão").selectOption({ index: 1 });
    await page.getByRole("textbox", { name: "Descrição da discussão" }).fill("Texto de teste com acentuação: promoção, ação e coração.");
    await page.getByRole("button", { name: "Publicar discussão" }).click();
    await expect(page).toHaveURL(/\/discussoes\/.+/);
    await expect(page.getByRole("heading", { level: 1, name: /\[e2e\] Discussão de teste/ })).toBeVisible();

    await page.locator("#comentarios textarea").first().fill(`Comentário de teste automatizado ${stamp}`);
    await page.getByRole("button", { name: "Comentar" }).first().click();
    await expect(page.getByText(`Comentário de teste automatizado ${stamp}`)).toBeVisible();

    await page.waitForLoadState("networkidle");
    await expectAccessible(page);
    await page.getByRole("button", { name: /remover discussão/i }).click();
    await page.waitForURL(/\/discussoes$/);
    await expect(page.getByText(`Discussão de teste automatizado ${stamp}`)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("P-1 cupom: assistente completo com imagem, fica pendente e a galeria aparece para o autor", async ({ page }) => {
    const errors = watch(page);
    await login(page, userLogin);
    await fillCouponUntilImages(page, `[e2e] Cupom de teste automatizado ${stamp}`, `cupom-e2e-${stamp}`);

    await page.locator("#w-files").setInputFiles({ name: "teste.png", mimeType: "image/png", buffer: makePng() });
    await expect(page.getByRole("button", { name: "Remover imagem" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click(); // descrição
    await page.getByRole("button", { name: "Continuar" }).click(); // detalhes
    await page.getByRole("button", { name: "Continuar" }).click(); // revisão
    await page.getByRole("button", { name: "Publicar cupom" }).click();

    // A conta de teste tem limite diário: se já foi usado, o teste não prova nada e é ignorado.
    const limit = page.getByText(/atingiu o limite de \d+ publicações/);
    await Promise.race([page.waitForURL(/enviada=1/, { timeout: 30_000 }), limit.waitFor({ timeout: 30_000 })]).catch(() => undefined);
    test.skip(await limit.isVisible(), "limite diário de publicações da conta de teste já usado");

    await expect(page).toHaveURL(/\/oferta\/.+enviada=1/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: /\[e2e\] Cupom de teste/ })).toBeVisible();
    await expect(page.locator("main img").first()).toBeVisible();

    // o mesmo link, com outro rastreador, é recusado como duplicata
    await page.goto("/publicar/cupom");
    await page.locator("#w-url").fill(`https://example.com/cupom-e2e-${stamp}?utm_source=outro`);
    await page.getByRole("button", { name: "Verificar link" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /já foi publicada/ })).toBeVisible({ timeout: 20_000 });
    expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
  });

  test("P-2 arquivo que não é imagem de verdade é recusado pelo servidor (confere os bytes)", async ({ page }) => {
    await login(page, userLogin);
    await fillCouponUntilImages(page, `[e2e] Cupom com imagem falsa ${stamp}`, `cupom-falso-${stamp}`);
    await page.locator("#w-files").setInputFiles({ name: "falsa.png", mimeType: "image/png", buffer: Buffer.from("isto não é uma imagem") });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Publicar cupom" }).click();
    // o erro precisa aparecer na tela: a pessoa é levada ao passo das imagens
    await expect(page.getByRole("alert").filter({ hasText: /falsa\.png/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#w-files")).toBeAttached();
    await expect(page).not.toHaveURL(/enviada=1/);
  });
});
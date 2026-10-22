import { expect, test } from "@playwright/test";
import { expectAccessible, watch } from "./helpers";

// Roda no projeto "mobile" (Pixel 7, 412 px). O que os visitantes mais usam: celular.
test.describe("celular @mobile", () => {
  test.beforeEach(async ({ context, baseURL }, info) => {
    test.skip(info.project.name !== "mobile", "estes casos são do projeto mobile");
    await context.addCookies([{ name: "promo-br-consent", value: "essential", url: baseURL! }]); // aviso de cookies já respondido
  });

  test("MOB-1 barra inferior e busca sempre à mão; ações do topo ficam só no desktop @mobile", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/");
    const bottom = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(bottom).toBeVisible();
    for (const name of ["Menu", "Alertas", "Publicar", "Entrar"]) await expect(bottom.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /entrar ou cadastrar/i })).toBeHidden();

    await page.getByRole("searchbox", { name: "Buscar ofertas" }).fill("teclado");
    await page.getByRole("searchbox", { name: "Buscar ofertas" }).press("Enter");
    await expect(page).toHaveURL(/\/busca\?q=teclado/);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });

  test("MOB-2 gaveta do menu: abre, mostra categorias, navega e fecha @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Abrir menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("navigation", { name: "Categorias" })).toBeVisible();
    await drawer.getByRole("link", { name: "Cupons" }).click();
    await expect(page).toHaveURL(/\/cupons/);
    await expect(drawer).toBeHidden();
  });

  test("MOB-3 cartão da oferta cabe na tela, mostra o botão na largura certa e a etiqueta de tempo inteira @mobile", async ({ page }) => {
    await page.goto("/");
    const vw = page.viewportSize()!.width;
    const card = page.locator("article[aria-labelledby^=t-]").first();
    await expect(card).toBeVisible();
    const box = (await card.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(vw + 1);
    const time = card.locator("time");
    const tb = (await time.boundingBox())!;
    expect(tb.x + tb.width).toBeLessThanOrEqual(box.x + box.width + 1); // a etiqueta não é cortada
    const cta = card.locator('a[href^="/ir/"], button:has-text("cupom")').first();
    const cb = (await cta.boundingBox())!;
    expect(cb.width).toBeGreaterThan(150);
    await expect(card.locator("p.line-clamp-3")).toBeHidden(); // descrição só a partir de telas maiores
  });

  test("MOB-4 página da oferta: botão fixo aparece ao rolar e some no fim da página @mobile", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator('a[href^="/oferta/"]').first().getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");
    const sticky = page.locator("div.fixed.bottom-16").filter({ has: page.locator('a[href^="/ir/"], button') });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    // com o botão principal na tela não há botão fixo duplicado; abaixo da dobra (título longo), o fixo aparece
    const mainInView = await page.locator("#deal-cta").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    await expect(sticky).toHaveCount(mainInView ? 0 : 1);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    await expect(sticky).toHaveCount(0); // fim da página: não cobre o rodapé
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test("DSK-1 Menu do cabeçalho no desktop abre a gaveta (antes o botão não fazia nada)", async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== "desktop", "só no projeto desktop");
  await context.addCookies([{ name: "promo-br-consent", value: "essential", url: baseURL! }]);
  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
});

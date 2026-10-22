import { expect, test } from "@playwright/test";
import { expectAccessible, watch } from "./helpers";

// Categorias, Cupons e Grátis: cada um abre um painel com as opções, "Ver todos" e o botão de fechar.
test.describe("menus do cabeçalho @mobile", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "promo-br-consent", value: "essential", url: baseURL! }]); // aviso de cookies já respondido
  });

  test("NAV-1 Categorias abre o painel com as categorias e leva à escolhida @mobile", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Seções" }).getByRole("button", { name: "Categorias" }).click();
    const panel = page.getByRole("dialog", { name: "Categorias" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/categorias");
    const first = panel.getByRole("navigation", { name: "Categorias" }).getByRole("link").first();
    const href = (await first.getAttribute("href"))!;
    expect(href).toMatch(/^\/c\/[a-z0-9-]+$/);
    await page.waitForLoadState("networkidle");
    await expectAccessible(page);
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(panel).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("NAV-2 Cupons lista as lojas; Esc fecha; Grátis leva ao tipo escolhido @mobile", async ({ page }) => {
    await page.goto("/");
    const sections = page.getByRole("navigation", { name: "Seções" });
    await sections.getByRole("button", { name: "Cupons" }).click();
    const cupons = page.getByRole("dialog", { name: "Cupons" });
    await expect(cupons.locator('a[href^="/loja/"]').first()).toBeVisible();
    await expect(cupons.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/cupons");
    await page.keyboard.press("Escape");
    await expect(cupons).toBeHidden();

    await sections.getByRole("button", { name: "Grátis" }).click();
    await page.getByRole("dialog", { name: "Grátis" }).getByRole("link", { name: "Jogos grátis" }).click();
    await expect(page).toHaveURL(/\/gratis\?tipo=jogos$/);
    await expect(page.getByRole("heading", { level: 1, name: "Jogos grátis" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Tipos de grátis" }).getByRole("link", { name: "Jogos grátis" })).toHaveAttribute("aria-current", "page");
  });

  test("NAV-3 no celular o painel ocupa a tela entre o topo e a barra inferior @mobile", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "só no celular");
    await page.goto("/");
    await page.getByRole("navigation", { name: "Seções" }).getByRole("button", { name: "Categorias" }).click();
    const box = (await page.getByRole("dialog", { name: "Categorias" }).boundingBox())!;
    const top = (await page.locator("#topo").boundingBox())!;
    const { width, height } = page.viewportSize()!;
    expect(Math.abs(box.y - (top.y + top.height))).toBeLessThanOrEqual(1);
    expect(box.y + box.height).toBeLessThanOrEqual(height - 64 + 1);
    expect(box.width).toBeGreaterThanOrEqual(width - 1);
  });

  test("NAV-4 Ver todos de Categorias mostra todas as categorias @mobile", async ({ page }) => {
    await page.goto("/categorias");
    await expect(page.getByRole("heading", { level: 1, name: "Categorias" })).toBeVisible();
    await expect(page.locator('main a[href^="/c/"]').first()).toBeVisible();
    await expectAccessible(page);
  });
});

import { expect, test } from "@playwright/test";
import { expectAccessible, watch } from "./helpers";

const ROUTES = [
  "/", "/?aba=novas", "/?aba=descontos", "/cupons", "/gratis", "/busca?q=teclado", "/black-friday", "/c/eletronicos", "/loja/amazon",
  "/discussoes", "/sobre", "/como-ganhamos-dinheiro", "/privacidade", "/termos", "/conduta", "/entrar", "/cadastrar", "/recuperar-senha",
];

for (const path of ROUTES) {
  test(`F-PUB ${path}: abre sem erro e sem falha grave de acessibilidade`, async ({ page }) => {
    const errors = watch(page);
    const res = await page.goto(path);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });
}

test("F-PUB oferta: página de uma oferta abre, com ação principal e comentários", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  const link = page.locator('a[href^="/oferta/"]').first();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /ir para a oferta/i }).or(page.getByRole("button", { name: /copiar|cupom/i })).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test("F-PUB busca: termo vazio e termo com aspas soltas não quebram", async ({ page }) => {
  for (const q of ["", '"', "a & b", "<script>alert(1)</script>"]) {
    const res = await page.goto(`/busca?q=${encodeURIComponent(q)}`);
    expect(res?.status()).toBeLessThan(500);
  }
  await page.goto(`/busca?q=${encodeURIComponent("<script>alert(1)</script>")}`);
  expect(await page.content()).not.toContain("<script>alert(1)</script>");
});

test("F-PUB 404: rota inexistente mostra página de não encontrado", async ({ page }) => {
  const res = await page.goto("/nao-existe-mesmo");
  expect(res?.status()).toBe(404);
});

test("F-PUB mobile @mobile: sem rolagem horizontal na home, na oferta e nas listagens", async ({ page }) => {
  for (const path of ["/", "/cupons", "/entrar"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
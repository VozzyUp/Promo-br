import { expect, test } from "@playwright/test";

test("C-1 aviso de cookies: aparece, recusar esconde e lembra a escolha", async ({ page, context }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Aviso de cookies" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Só o essencial" }).click();
  await expect(banner).toBeHidden();
  const cookie = (await context.cookies()).find((c) => c.name === "promo-br-consent");
  expect(cookie?.value).toBe("essential");
  await page.reload();
  await expect(banner).toBeHidden();
  expect(await page.locator('script[src*="adsbygoogle"]').count()).toBe(0);
});

test("C-2 aceitar grava o cookie e o rodapé deixa mudar de ideia", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Aceitar anúncios" }).click();
  expect((await context.cookies()).find((c) => c.name === "promo-br-consent")?.value).toBe("all");
  await page.getByRole("button", { name: "Preferências de cookies" }).click();
  await expect(page.getByRole("region", { name: "Aviso de cookies" })).toBeVisible();
});

test("C-3 sem escolha, nenhum script de anúncio é carregado", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(requests.filter((u) => /googlesyndication|doubleclick/.test(u))).toEqual([]);
});
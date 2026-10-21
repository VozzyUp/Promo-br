import { expect, test } from "@playwright/test";

// O servidor da porta 3200 roda com os limites de tentativa ligados (o da 3100 os desliga para a suíte poder entrar várias vezes).
test("I-2 login: depois de muitas tentativas erradas o site pede para esperar", async ({ page }) => {
  const email = `forca-bruta-${Date.now().toString(36)}@promo-br.test`;
  await page.goto("/entrar");
  let blocked = false;
  for (let i = 0; i < 10 && !blocked; i++) {
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(`errada-${i}-123`);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600); // dá tempo de a mensagem desta tentativa substituir a da anterior
    await expect(page.getByText(/incorretos|Muitas tentativas/)).toBeVisible();
    blocked = await page.getByText(/Muitas tentativas\. Espere/).isVisible();
  }
  expect(blocked).toBe(true);
});

test("I-3 recuperar senha: o limite por IP também vale", async ({ page }) => {
  let blocked = false;
  for (let i = 0; i < 8 && !blocked; i++) {
    await page.goto("/recuperar-senha");
    await page.getByLabel("E-mail").fill(`ninguem-${i}-${Date.now().toString(36)}@promo-br.test`);
    await page.getByRole("button", { name: /enviar|recuperar/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/se existir uma conta|Muitas tentativas/i)).toBeVisible();
    blocked = await page.getByText(/Muitas tentativas\. Espere/).isVisible();
  }
  expect(blocked).toBe(true);
});
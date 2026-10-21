import { expect, test } from "@playwright/test";

// O servidor da porta 3200 roda com os limites de tentativa ligados (o da 3100 os desliga para a suíte poder entrar várias vezes).
test("I-2 login: depois de muitas tentativas erradas o site pede para esperar", async ({ page }) => {
  const email = `forca-bruta-${Date.now().toString(36)}@promo-br.test`;
  await page.goto("/entrar");
  let blocked = false;
  for (let i = 0; i < 10 && !blocked; i++) {
    // o React limpa o formulário logo depois de cada resposta: confere que os campos continuam preenchidos antes de enviar
    for (let tries = 0; tries < 5; tries++) {
      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha").fill(`errada-${i}-123`);
      await page.waitForTimeout(250);
      if ((await page.getByLabel("Senha").inputValue()) !== "") break;
    }
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600); // dá tempo de a mensagem desta tentativa substituir a da anterior
    await expect(page.getByText(/incorretos|Muitas tentativas/)).toBeVisible({ timeout: 20_000 });
    blocked = await page.getByText(/Espere \d+ min/).isVisible();
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
    await expect(page.getByText(/se existir uma conta|Muitas tentativas/i)).toBeVisible({ timeout: 20_000 });
    blocked = await page.getByText(/Espere \d+ min/).isVisible();
  }
  expect(blocked).toBe(true);
});
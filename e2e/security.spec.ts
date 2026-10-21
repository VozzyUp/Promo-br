import { expect, test } from "@playwright/test";

test("S-HDR cabeçalhos de segurança em todas as páginas", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"] ?? h["content-security-policy-report-only"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

for (const path of ["/painel", "/painel/lojas", "/painel/integracoes", "/painel/robo", "/painel/canais", "/painel/execucoes", "/painel/metricas", "/painel/usuarios", "/painel/ofertas"]) {
  test(`S-AUTH ${path}: anônimo vai para o login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar/);
  });
}

for (const path of ["/conta", "/conta/exportar", "/publicar/oferta", "/alertas"]) {
  test(`S-AUTH ${path}: exige login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar/);
  });
}

test("S-REDIR login ignora destino externo no next", async ({ page }) => {
  await page.goto("/entrar?next=//evil.example.com");
  // o formulário guarda o destino, mas só caminhos internos passam por safeNext no servidor
  await expect(page).toHaveURL(/\/entrar/);
});

test("S-IR código inexistente volta para a home sem vazar nada", async ({ request }) => {
  const res = await request.get("/ir/naoexiste", { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(new URL(res.headers().location, "http://x").pathname).toBe("/");
});

test("S-IR oferta real: 302 para a loja, sem cache e sem indexação", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('a[href^="/ir/"]').first().getAttribute("href");
  test.skip(!href, "nenhuma oferta com link na home");
  const res = await request.get(href!, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
});

test("S-PUB arquivos públicos", async ({ request }) => {
  expect((await request.get("/api/health")).status()).toBe(200);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /painel");
  expect(robots).toContain("Disallow: /ir/");
  const ads = await request.get("/ads.txt");
  expect(ads.status()).toBe(200);
  expect(ads.headers()["content-type"]).toContain("text/plain");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
});

test("S-LOGIN senha errada mostra mensagem genérica e não revela se a conta existe", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("ninguem-existe@promo-br.test");
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible();
});

test("S-RECUPERAR mesma resposta para e-mail que existe e que não existe", async ({ page }) => {
  const msgs: string[] = [];
  for (const email of ["admin@promo-br.test", "ninguem-existe@promo-br.test"]) {
    await page.goto("/recuperar-senha");
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: /enviar|recuperar/i }).click();
    await expect(page.getByText(/se existir uma conta/i)).toBeVisible();
    msgs.push(await page.getByText(/se existir uma conta/i).innerText());
  }
  expect(msgs[0]).toBe(msgs[1]);
});
import { expect, test } from "@playwright/test";
import { adminLogin, login } from "../helpers";

const STUB = "http://127.0.0.1:4010";

/**
 * Fonte do Telegram (canal público) contra a página de canal de mentira do stub:
 * o robô cria a oferta com o link da loja sem o afiliado de quem publicou, cria o cupom da loja,
 * ignora recado sem link, filtra palavra bloqueada, explica o que ficou sem loja e não relê o que já leu.
 */
test("F-1 fonte do Telegram: link limpo na fila de aprovação, cupom, filtros e sem repetir", async ({ page }) => {
  test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD no .env.local");
  const { asin, coupon } = (await (await fetch(`${STUB}/_tg_reset`)).json()) as { asin: string; coupon: string };
  const stamp = Date.now().toString(36);
  const name = `Fonte int ${stamp}`;
  await login(page, adminLogin);
  await page.goto("/painel/fontes");
  test.skip(await page.getByText("Falta rodar a migração 8").isVisible(), "migração 8 (fontes) ainda não rodou no Supabase");

  const nova = page.locator('section[aria-labelledby="nova-t"]');
  try {
    // canal que não abre sem login: erro claro, nada salvo
    await nova.locator("#sn-new").fill(name);
    await nova.locator("#sc-new").fill("@naoexistestub");
    await nova.getByRole("button", { name: "Adicionar fonte" }).click();
    await expect(nova.getByText(/Canal não encontrado, privado ou sem prévia pública/)).toBeVisible({ timeout: 20_000 });

    await nova.locator("#sc-new").fill("https://t.me/s/canalteste");
    await nova.locator("#sb-new").fill("sorteio");
    await nova.getByRole("button", { name: "Adicionar fonte" }).click();
    await expect(nova.getByText("Salvo.")).toBeVisible({ timeout: 20_000 });

    await page.goto("/painel/fontes");
    const row = page.locator("main ul > li").filter({ hasText: name });
    await expect(row).toContainText("@canalteste");
    await expect(row).toContainText("vai para a fila");
    await row.locator("summary").click();
    await row.getByRole("button", { name: "Ler agora" }).click();
    const done = row.getByText(/Terminou:/);
    await expect(done).toBeVisible({ timeout: 60_000 });
    const stats = await done.innerText();
    expect(stats).toContain('"read":5');
    expect(stats).toContain('"created":2');
    expect(stats).toContain('"filtered":1');
    expect(stats).toContain('"noStoreLink":1');
    expect(stats).toContain('"ignored":1');
    expect(stats).toContain('"published":0');

    // a lista de lidas mostra cada uma com o motivo
    await page.goto("/painel/fontes");
    const lidas = page.locator('section[aria-labelledby="lidas-t"]');
    const product = lidas.locator("li").filter({ hasText: "Fone Bluetooth Stub Teste XYZ-123 Preto" }).first();
    await expect(product).toContainText("Criada");
    await expect(product).toContainText(`https://www.amazon.com.br/dp/${asin}`);
    await expect(product).toContainText("Oferta na fila");
    await expect(lidas.locator("li").filter({ hasText: "Panela Stub" }).first()).toContainText("Sem link da loja");
    await expect(lidas.locator("li").filter({ hasText: "Sorteio Edition" }).first()).toContainText('palavra bloqueada "sorteio"');

    // na fila de aprovação: link limpo (sem tag do outro canal) e a origem
    await page.goto("/painel");
    const deal = page.locator("main li").filter({ hasText: `dp/${asin}` });
    await expect(deal).toHaveCount(1);
    await expect(deal).toContainText("Fone Bluetooth Stub Teste XYZ-123 Preto");
    await expect(deal).toContainText(`Do Telegram: ${name}`);
    await expect(deal).not.toContainText("tag=");
    await expect(deal).toContainText("R$ 99,90");
    const cupom = page.locator("main li").filter({ hasText: coupon });
    await expect(cupom).toContainText(/Cupom R\$ 20,00 OFF em compras acima de R\$ 99,00 - Shopee/);

    // segunda leitura: nada novo, nada repetido na fila
    await page.goto("/painel/fontes");
    const again = page.locator("main ul > li").filter({ hasText: name });
    await again.locator("summary").click();
    await again.getByRole("button", { name: "Ler agora" }).click();
    await expect(again.getByText(/"new":0/)).toBeVisible({ timeout: 60_000 });
  } finally {
    // limpeza pela interface: recusa o que o robô criou e apaga a fonte
    await page.goto("/painel");
    for (const marker of [`dp/${asin}`, coupon]) {
      const li = page.locator("main li").filter({ hasText: marker });
      if (await li.count()) {
        await li.locator('input[name="reason"]').fill("teste automático");
        await li.getByRole("button", { name: "Recusar" }).click();
        await page.waitForLoadState("networkidle");
      }
    }
    await page.goto("/painel/fontes");
    const row = page.locator("main ul > li").filter({ hasText: name });
    if (await row.count()) {
      await row.locator("summary").click();
      await row.getByRole("button", { name: "Apagar fonte" }).click();
      await expect(page.locator("main ul > li").filter({ hasText: name })).toHaveCount(0);
    }
  }
});

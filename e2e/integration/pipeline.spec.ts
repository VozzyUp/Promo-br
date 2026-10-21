import { expect, test, type Page } from "@playwright/test";
import { adminLogin, login } from "../helpers";

const STUB = "http://127.0.0.1:4010";
const SITE = "http://127.0.0.1:3200";

type Call = { kind: string; keyword?: string; subIds?: string[]; chat?: string; text?: string };
const calls = async (): Promise<Call[]> => (await fetch(`${STUB}/_calls`)).json();

/** Lê "Comissão estimada" do painel de métricas, em centavos. */
async function commissionCents(page: Page): Promise<number> {
  await page.goto("/painel/metricas?dias=7");
  const text = await page.getByText("Comissão estimada", { exact: true }).locator("xpath=following-sibling::p[1]").innerText();
  return Math.round(parseFloat(text.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
}

const form = (page: Page, innerSelector: string) => page.locator("form", { has: page.locator(innerSelector) });

/** Percorre o pipeline todo contra o servidor de mentira: integrações, robô, fila de envio, Telegram e vendas. */
test("I-1 pipeline completo: Shopee, robô, canal Telegram, envio e vendas", async ({ page, request }) => {
  test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD no .env.local");
  const stamp = Date.now().toString(36);
  await fetch(`${STUB}/_reset`);
  await login(page, adminLogin);
  const botUa = { "user-agent": "e2e-bot" }; // não conta como clique real nas métricas

  try {
    // 1) Shopee: assinatura errada é recusada e a certa conecta; o segredo nunca volta para a tela
    await page.goto("/painel/integracoes");
    const shopee = form(page, "#shopee-appId");
    await page.locator("#shopee-appId").fill("app-teste");
    await page.locator("#shopee-secret").fill("segredo-errado");
    await shopee.locator('input[name="enabled"]').check();
    await shopee.getByRole("button", { name: "Salvar e testar conexão" }).click();
    await expect(shopee.getByText(/Invalid Signature/).first()).toBeVisible();
    await page.locator("#shopee-secret").fill("segredo-teste");
    await shopee.getByRole("button", { name: "Salvar e testar conexão" }).click();
    await expect(shopee.getByText(/Conectado\. A busca de teste devolveu 4 produto/)).toBeVisible();
    await page.reload();
    expect(await page.content()).not.toContain("segredo-teste");
    await expect(page.locator("#shopee-secret")).toHaveAttribute("placeholder", /Salvo/);

    // 2) Telegram: token errado e certo
    const tg = form(page, "#telegram-botToken");
    await page.locator("#telegram-botToken").fill("000:errado");
    await tg.locator('input[name="enabled"]').check();
    await tg.getByRole("button", { name: "Salvar e testar conexão" }).click();
    await expect(tg.getByText("Unauthorized").first()).toBeVisible();
    await page.locator("#telegram-botToken").fill("123456:stub-token");
    await tg.getByRole("button", { name: "Salvar e testar conexão" }).click();
    await expect(tg.getByText("Conectado ao bot @stub_bot.")).toBeVisible();

    // 3) Robô: regra ligada, publicando direto; só passam as 2 ofertas que cumprem desconto, vendas e nota
    await page.goto("/painel/robo");
    await page.locator("#n-new").fill(`Regra int ${stamp}`);
    await page.locator("#k-new").fill("fone\nteclado");
    await page.locator("#d-new").fill("20");
    await page.locator("#r-new").fill("5");
    const newRule = form(page, "#n-new");
    await newRule.locator('input[name="active"]').check();
    await newRule.locator('input[name="autoPublish"]').check();
    await newRule.getByRole("button", { name: "Criar regra" }).click();
    await expect(newRule.getByText("Salvo.")).toBeVisible();
    await page.goto("/painel/robo");
    const rule = page.locator("main ul > li").filter({ hasText: `Regra int ${stamp}` });
    await rule.locator("summary").click();
    const before = (await calls()).length; // o "testar conexão" de antes também buscou na Shopee
    await rule.getByRole("button", { name: "Rodar agora" }).click();
    await expect(rule.getByText(/Terminou: .*"created":2,"published":2,"duplicates":0,"filtered":2,"inflated":0,"errors":0/)).toBeVisible({ timeout: 30_000 });

    const sent = (await calls()).slice(before);
    expect(sent.filter((c) => c.kind === "shopee.search").map((c) => c.keyword)).toEqual(["fone", "teclado"]);
    const codes = sent.filter((c) => c.kind === "shopee.shortLink").map((c) => c.subIds![0]);
    expect(codes).toHaveLength(2);

    // as ofertas estão no ar, vindas do robô, e o /ir/ leva ao link curto com o código da oferta no subId
    await page.goto("/painel/ofertas?q=Stub&status=published");
    await expect(page.locator("main li").filter({ hasText: "robô" })).toHaveCount(2);
    const res = await request.get(`${SITE}/ir/${codes[0]}`, { maxRedirects: 0, headers: botUa });
    expect(res.status()).toBe(302);
    expect(res.headers().location).toBe(`https://s.shopee.com.br/stub-${codes[0]}`);
    await page.goto("/painel/ofertas?q=Fone Bluetooth Stub&status=published");
    const dealHref = await page.locator('main li a[href^="/oferta/"]').first().getAttribute("href");
    await page.goto(dealHref!);
    await expect(page.getByText("R$ 99,90").first()).toBeVisible();
    await expect(page.getByText("-40%").first()).toBeVisible();

    // 4) Canal Telegram: fila e limite de 1 por hora
    await page.goto("/painel/canais");
    const newCh = form(page, "#n-new");
    await page.locator("#n-new").fill(`Canal int ${stamp}`);
    await page.locator("#g-new").fill("@stub_canal");
    await page.locator("#ws-new").fill("00:00");
    await page.locator("#we-new").fill("23:59");
    await page.locator("#h-new").fill("1");
    await newCh.locator('input[name="active"]').check();
    await newCh.getByRole("button", { name: "Criar canal" }).click();
    await expect(newCh.getByText("Salvo.")).toBeVisible();

    await page.goto("/painel/execucoes");
    const dispatch = form(page, 'button:has-text("Enviar para os canais")');
    await dispatch.getByRole("button", { name: "Enviar para os canais" }).click();
    await expect(dispatch.getByText(/"enqueued":2,"sent":1,"failed":0/)).toBeVisible({ timeout: 30_000 });
    await dispatch.getByRole("button", { name: "Enviar para os canais" }).click();
    await expect(dispatch.getByText(/"enqueued":0,"sent":0/)).toBeVisible({ timeout: 30_000 }); // teto de 1 por hora

    const msgs = (await calls()).filter((c) => c.kind === "telegram.sendMessage");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].chat).toBe("@stub_canal");
    expect(msgs[0].text).toMatch(/<b>.*Stub.*<\/b>/);
    expect(msgs[0].text).toMatch(/👉 https?:\/\/[^ ]+\/oferta\/fone-bluetooth-stub/); // a base do endereço vem de NEXT_PUBLIC_SITE_URL, gravada no build
    expect(msgs[0].text).toMatch(/R\$\s?(99,90|149,00)/);

    // 5) Vendas: o subId volta no relatório e a venda é ligada à oferta
    const commissionBefore = await commissionCents(page);
    await fetch(`${STUB}/_conversion`, { method: "POST", body: JSON.stringify({ subId: codes[0] }) });
    await page.goto("/painel/execucoes");
    const sync = form(page, 'button:has-text("Sincronizar vendas da Shopee")');
    await sync.getByRole("button", { name: "Sincronizar vendas da Shopee" }).click();
    await expect(sync.getByText(/"fetched":1,"matched":1/)).toBeVisible({ timeout: 30_000 });
    expect((await commissionCents(page)) - commissionBefore).toBe(750); // a venda de R$ 7,50 entrou nas métricas
  } finally {
    // limpeza pela própria interface: ofertas do robô removidas, canal e regra apagados, integrações desligadas
    await page.goto("/painel/ofertas?q=Stub&status=published");
    for (let i = 0; i < 4; i++) {
      const row = page.locator("main li").filter({ hasText: "robô" }).first();
      if ((await row.count()) === 0) break;
      await row.getByRole("button", { name: "Remover" }).click();
      await page.waitForLoadState("networkidle");
      await page.goto("/painel/ofertas?q=Stub&status=published");
    }
    await page.goto("/painel/canais");
    const ch = page.locator("main ul > li").filter({ hasText: `Canal int ${stamp}` });
    if (await ch.count()) {
      await ch.locator("summary").click();
      await ch.getByRole("button", { name: "Apagar canal" }).click();
    }
    await page.goto("/painel/robo");
    const r = page.locator("main ul > li").filter({ hasText: `Regra int ${stamp}` });
    if (await r.count()) {
      await r.locator("summary").click();
      await r.getByRole("button", { name: "Apagar regra" }).click();
    }
    await page.goto("/painel/integracoes");
    for (const sel of ["#shopee-appId", "#telegram-botToken"]) {
      const f = form(page, sel);
      await f.locator('input[name="enabled"]').uncheck();
      await f.getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(f.getByText("Salvo.")).toBeVisible();
    }
  }
});
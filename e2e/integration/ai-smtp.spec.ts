import { expect, test, type Page } from "@playwright/test";
import { adminLogin, login } from "../helpers";

const STUB = "http://127.0.0.1:4010";

const form = (page: Page, innerSelector: string) => page.locator("form", { has: page.locator(innerSelector) });
const mails = async (): Promise<{ to: string[]; data: string }[]> => (await fetch(`${STUB}/_mails`)).json();

async function setIntegration(page: Page, key: string, fields: Record<string, string>, enabled: boolean) {
  await page.goto("/painel/integracoes");
  const f = form(page, `#${key}-${Object.keys(fields)[0]}`);
  for (const [name, value] of Object.entries(fields)) await page.locator(`#${key}-${name}`).fill(value);
  const box = f.locator('input[name="enabled"]');
  if (enabled) await box.check(); else await box.uncheck();
  await f.getByRole("button", { name: "Salvar e testar conexão" }).click();
  return f;
}

test("I-2 IA: o botão só existe com a integração ligada, mostra a sugestão e só aplica no clique", async ({ page }) => {
  test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD no .env.local");
  await login(page, adminLogin);
  try {
    // chave errada: a conexão falha com a mensagem da API
    const bad = await setIntegration(page, "anthropic", { apiKey: "sk-errada", model: "claude-stub" }, true);
    await expect(bad.getByText(/invalid x-api-key/).first()).toBeVisible();
    const ok = await setIntegration(page, "anthropic", { apiKey: "sk-stub", model: "claude-stub" }, true);
    await expect(ok.getByText(/Conectado\. O modelo claude-stub respondeu/)).toBeVisible();

    // o servidor guarda 60 s de cache sobre "IA ligada"; o primeiro acesso depois de ligar pode ainda não ver o botão
    await page.goto("/publicar/cupom");
    await page.locator("#w-url").fill(`https://www.example.com/ia-${Date.now().toString(36)}`);
    await page.getByRole("button", { name: "Verificar link" }).click();
    await expect(page.getByText(/Nenhuma oferta repetida encontrada/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#w-title").fill("cupom de 10% loja");
    const btn = page.getByRole("button", { name: "Melhorar o título com IA" });
    await expect(btn).toBeVisible({ timeout: 70_000 });
    await btn.click();
    await expect(page.getByText("Cupom E2E de 10% de desconto em loja de exemplo")).toBeVisible();
    // ainda não aplicou
    await expect(page.locator("#w-title")).toHaveValue("cupom de 10% loja");
    await page.getByRole("button", { name: "Usar", exact: true }).click();
    await expect(page.locator("#w-title")).toHaveValue("Cupom E2E de 10% de desconto em loja de exemplo");
    // o pedido levou os dados dentro das marcas e a chave não aparece na página
    const sent = (await (await fetch(`${STUB}/_calls`)).json()).filter((c: { kind: string }) => c.kind === "anthropic.messages");
    expect(sent.at(-1).user).toContain("<dados>");
    expect(await page.content()).not.toContain("sk-stub");
  } finally {
    await setIntegration(page, "anthropic", { apiKey: "", model: "claude-stub" }, false);
  }
});

test("I-3 SMTP: a conexão é testada (senha errada e certa) e o e-mail do boletim chega", async ({ page }) => {
  test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD no .env.local");
  await login(page, adminLogin);
  await fetch(`${STUB}/_mails_reset`);
  const smtp = { host: "127.0.0.1", port: "4025", user: "ofertas", password: "senha-errada", from: "Site <ofertas@exemplo.com>" };
  try {
    const bad = await setIntegration(page, "smtp", smtp, true);
    await expect(bad.getByText(/credenciais erradas|535|Invalid login/i).first()).toBeVisible();
    const ok = await setIntegration(page, "smtp", { ...smtp, password: "senha-stub" }, true);
    await expect(ok.getByText(/Conectado a 127\.0\.0\.1:4025/)).toBeVisible();
    await page.reload();
    expect(await page.content()).not.toContain("senha-stub");

    // inscrição pelo rodapé (precisa da migração 7; sem ela o formulário nem aparece)
    const anon = await page.context().browser()!.newContext({ baseURL: "http://127.0.0.1:3200" });
    const visitor = await anon.newPage();
    await visitor.goto("/");
    await visitor.waitForTimeout(500);
    let nl = visitor.getByLabel("Seu e-mail", { exact: true });
    if ((await nl.count()) === 0) {
      // o cache de 60 s sobre "boletim disponível" pode ter guardado "não"; espera e tenta de novo
      await visitor.waitForTimeout(61_000);
      await visitor.goto("/");
      nl = visitor.getByLabel("Seu e-mail", { exact: true });
    }
    test.skip((await nl.count()) === 0, "o formulário do boletim não apareceu: rode a migração 7 no Supabase");
    const email = `e2e-${Date.now().toString(36)}@exemplo.com`;
    await nl.fill(email);
    await visitor.getByRole("button", { name: "Quero receber" }).click();
    await expect(visitor.getByText(/Enviamos um e-mail para você confirmar/)).toBeVisible();
    await expect.poll(async () => (await mails()).some((m) => m.to.includes(email))).toBe(true);
    const confirm = (await mails()).find((m) => m.to.includes(email))!;
    const link = /http:\/\/[^\s"<]+\/boletim\/confirmar\?t=[0-9a-f]{32}/.exec(confirm.data.replace(/=\r\n/g, ""))![0];
    // abrir o link não confirma sozinho: só o clique
    await visitor.goto(new URL(link).pathname + new URL(link).search);
    await expect(visitor.getByRole("button", { name: "Confirmar inscrição" })).toBeVisible();
    await visitor.getByRole("button", { name: "Confirmar inscrição" }).click();
    await expect(visitor.getByText(/Inscrição confirmada/)).toBeVisible();

    // envio semanal pelo painel
    await page.goto("/painel/execucoes");
    await page.getByRole("button", { name: /Enviar o boletim agora/ }).click();
    await expect(page.getByText(/Terminou:.*"sent":\d+/)).toBeVisible({ timeout: 60_000 });
    await expect.poll(async () => (await mails()).some((m) => m.to.includes(email) && /ofertas mais quentes da semana|oferta mais quente/.test(m.data))).toBe(true);
    const digest = (await mails()).find((m) => m.to.includes(email) && /quentes? da semana/.test(m.data))!;
    expect(digest.data).toContain("List-Unsubscribe:");
    const out = /http:\/\/[^\s"<]+\/boletim\/sair\?t=[0-9a-f]{32}/.exec(digest.data.replace(/=\r\n/g, ""))![0];
    await visitor.goto(new URL(out).pathname + new URL(out).search);
    await visitor.getByRole("button", { name: "Cancelar inscrição" }).click();
    await expect(visitor.getByText(/não recebe mais o boletim/)).toBeVisible();
    await anon.close();
  } finally {
    await setIntegration(page, "smtp", { ...smtp, password: "" }, false);
  }
});
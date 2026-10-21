import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Junta erros de console e respostas 5xx durante o teste. */
export function watch(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}

/** Falha em violações graves ou críticas de acessibilidade. */
export async function expectAccessible(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.length}x ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

export const adminLogin = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@promo-br.test",
  password: process.env.SEED_ADMIN_PASSWORD ?? "",
};
export const userLogin = {
  email: process.env.E2E_USER_EMAIL ?? "tester@promo-br.test",
  password: process.env.SEED_USER_PASSWORD ?? "",
};

export async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(who.email);
  await page.getByLabel("Senha").fill(who.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}
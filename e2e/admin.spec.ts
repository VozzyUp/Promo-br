import { expect, test } from "@playwright/test";
import { adminLogin, expectAccessible, login, userLogin, watch } from "./helpers";

const PANEL = [
  ["/painel", "Fila de ofertas"], ["/painel/ofertas", "Ofertas e cupons"], ["/painel/usuarios", "Usuários"], ["/painel/lojas", "Lojas"],
  ["/painel/metricas", "Métricas"], ["/painel/robo", /Robô de captação/], ["/painel/canais", "Canais de envio"], ["/painel/integracoes", "Integrações"],
  ["/painel/execucoes", "Execuções"], ["/painel/anuncios", "Anúncios"], ["/painel/aparencia", "Aparência e SEO"], ["/painel/paginas", "Páginas e textos"],
  ["/painel/denuncias", /Denúncias/], ["/painel/ranking", "Ranking das ofertas quentes"],
] as const;

test.describe("admin", () => {
  test.skip(!adminLogin.password, "sem SEED_ADMIN_PASSWORD no .env.local");

  for (const [path, title] of PANEL) {
    test(`A-PANEL ${path}: carrega para admin, sem erro e acessível`, async ({ page }) => {
      const errors = watch(page);
      await login(page, adminLogin);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectAccessible(page);
      expect(errors).toEqual([]);
    });
  }

  test("A-ROLE usuário comum não entra no painel", async ({ page }) => {
    test.skip(!userLogin.password, "sem SEED_USER_PASSWORD");
    await login(page, userLogin);
    for (const p of ["/painel", "/painel/lojas", "/painel/integracoes", "/painel/usuarios"]) {
      await page.goto(p);
      await expect(page.getByRole("heading", { name: /fila de ofertas|^lojas$|integrações|usuários/i })).toHaveCount(0);
    }
  });

  test("A-LEGAL páginas institucionais renderizam o texto padrão com títulos e listas", async ({ page }) => {
    await page.goto("/privacidade");
    await expect(page.getByRole("heading", { level: 2, name: "O que coletamos" })).toBeVisible();
    await expect(page.locator("article ul li").first()).toBeVisible();
  });
});
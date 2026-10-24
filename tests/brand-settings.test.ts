import { beforeEach, describe, expect, it, vi } from "vitest";

const setting = vi.hoisted(() => ({ enabled: false, value: null as unknown }));

vi.mock("../lib/supabase/server", () => ({ supabaseEnabled: () => setting.enabled }));
vi.mock("../lib/supabase/db", () => ({
  db: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { value: setting.value }, error: null }) }),
      }),
    }),
  }),
}));

beforeEach(() => {
  vi.resetModules();
  setting.enabled = false;
  setting.value = null;
});

describe("marca pública", () => {
  it("usa PromoValeu quando a aparência ainda não foi configurada", async () => {
    const { getBrandSettings } = await import("../lib/data/settings");
    expect((await getBrandSettings()).siteName).toBe("PromoValeu");
  });

  it("atualiza o nome provisório salvo sem apagar os textos do administrador", async () => {
    setting.enabled = true;
    setting.value = { siteName: "promo-br", description: "Descrição personalizada", commissionNotice: "Aviso personalizado" };
    const { getBrandSettings } = await import("../lib/data/settings");
    expect(await getBrandSettings()).toEqual({
      siteName: "PromoValeu", description: "Descrição personalizada", commissionNotice: "Aviso personalizado",
    });
  });

  it("mantém um nome personalizado no painel", async () => {
    setting.enabled = true;
    setting.value = { siteName: "Meu Clube", description: "Descrição", commissionNotice: "Aviso" };
    const { getBrandSettings } = await import("../lib/data/settings");
    expect(await getBrandSettings()).toEqual(setting.value);
  });
});

// Tira as capturas lado a lado (referência x clone) no mesmo tamanho de tela, para o replica-diff.
// Uso: node scripts/capture-diff.mjs  (precisa do site rodando em http://localhost:3100)
// A referência é aberta como visitante comum, uma página por captura, só para consulta local. As imagens dela não vão para o repositório.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const REF = "https://www.promodescuentos.com";
const CLONE = "http://localhost:3100";
const SHOTS = [
  { id: "S01-home", ref: `${REF}/`, clone: `${CLONE}/` },
  { id: "S02-cupom", ref: `${REF}/cupones/eneba-cupon-del-15-para-cualquier-juego-o-dlc-1200489`, clone: `${CLONE}/oferta/cupom-de-15-em-jogos-digitais-selecionados-ce88` },
];
const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  // desktop fica de fora: a referência devolve a verificação anti-robô da Cloudflare ao navegador automatizado, e isso não se contorna.
};

mkdirSync("replica/screens", { recursive: true });
mkdirSync("replica/clone-screens", { recursive: true });
const browser = await chromium.launch();
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  for (const shot of SHOTS) {
    for (const side of ["ref", "clone"]) {
      const ctx = await browser.newContext({ ...vp, locale: side === "ref" ? "es-MX" : "pt-BR" });
      // O aviso de cookies do clone cobre parte da tela; na comparação de estrutura ele fica já respondido.
      if (side === "clone") await ctx.addCookies([{ name: "promo-br-consent", value: "essential", url: CLONE }]);
      const page = await ctx.newPage();
      try {
        await page.goto(shot[side], { waitUntil: "load", timeout: 45000 });
        await page.waitForTimeout(3500);
        const dir = side === "ref" ? "replica/screens" : "replica/clone-screens";
        await page.screenshot({ path: `${dir}/${shot.id}-${vpName}-top.png` });
        await page.screenshot({ path: `${dir}/${shot.id}-${vpName}-full.png`, fullPage: true });
        if (vpName === "mobile") {
          for (const [n, y] of [[1, 844], [2, 1688]]) {
            await page.evaluate((top) => window.scrollTo(0, top), y);
            await page.waitForTimeout(700);
            await page.screenshot({ path: `${dir}/${shot.id}-${vpName}-s${n}.png` });
          }
        }
        console.log("ok", side, shot.id, vpName);
      } catch (e) {
        console.log("falhou", side, shot.id, vpName, e.message.slice(0, 80));
      }
      await ctx.close();
      await new Promise((r) => setTimeout(r, 1500)); // devagar com a referência
    }
  }
}
await browser.close();
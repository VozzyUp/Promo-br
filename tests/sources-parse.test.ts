import { describe, expect, it } from "vitest";
import { channelLabel, channelPageInfo, normalizeChannel, parseChannelPage } from "../lib/sources/parse-web";
import { cleanPageTitle, parsePost } from "../lib/sources/parse-post";
import type { RawPost } from "../lib/sources/types";

// Página pública de canal no formato do t.me/s (texto inventado, estrutura igual à real).
const emoji = (e: string) => `<i class="emoji" style="background-image:url('//telegram.org/img/emoji/40/X.png')"><b>${e}</b></i>`;
const msg = (id: number, body: string, photo = true) => `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message text_not_supported_wrap js-widget_message" data-post="canalteste/${id}" data-view="x">
  <div class="tgme_widget_message_author accent_color"><a class="tgme_widget_message_owner_name" href="https://t.me/canalteste"><span dir="auto">Canal ${emoji("💥")}</span></a></div>
  ${photo ? `<a class="tgme_widget_message_photo_wrap 1 2" href="https://t.me/canalteste/${id}" style="width:800px;background-image:url('https://cdn1.telesco.pe/file/abc${id}.jpg')"><div class="tgme_widget_message_photo"></div></a>` : ""}<div class="tgme_widget_message_text js-message_text" dir="auto">${body}</div>
  <div class="tgme_widget_message_footer compact js-message_footer"><div class="tgme_widget_message_info short js-message_info"><span class="tgme_widget_message_meta"><a class="tgme_widget_message_date" href="https://t.me/canalteste/${id}"><time datetime="2026-10-21T17:19:23+00:00" class="time">17:19</time></a></span></div></div>
</div></div>`;

const PAGE = `<html><body><section class="tgme_channel_history js-message_history">
${msg(101, `<b>O QUARTO NOVO COMEÇA COM UMA PAREDE LISINHA&#33;</b> ${emoji("🏠")}<br/><br/>Massa Corrida Reveste Mais 23kg Uso Interno<br/><br/>${emoji("🔥")} Por: <b>R&#036; 69,00</b> à vista<br/>${emoji("🛒")} <a href="https://meli.la/2dsh2fX" target="_blank" rel="noopener">https://meli.la/2dsh2fX</a>`)}
${msg(100, `Oferta exclusiva para membros amazon prime${emoji("‼")}<br/><br/><b>Smart TV 50 Philco PTV50G7PR2CSB 4K Roku TV Led Dolby Audio</b><br/>${emoji("🔥")}R&#036; 1798,99 parcelado<br/><br/>${emoji("🛒")}Compre aqui: <a href="https://promosdodia.example/ofertas/smart-tv-50">https://promosdodia.example/ofertas/smart-tv-50</a><br/><br/>Seja prime e tenha frete grátis: <a href="https://is.gd/t55rcy">https://is.gd/t55rcy</a>`)}
${msg(102, `${emoji("🔥")} Novo Cupom Mercado Livre&#33;<br/>${emoji("▪")} R&#036;150 OFF em compras acima de R&#036;1.199<br/>${emoji("🎯")} Usem o cupom: ESQTVSCEL2110<br/><a href="https://mercadolivre.com/sec/2P5pupn">https://mercadolivre.com/sec/2P5pupn</a>`, false)}
</section></body></html>`;

describe("página pública do canal", () => {
  const posts = parseChannelPage(PAGE, "canalteste");
  it("lê as publicações em ordem, com links, negrito, foto, data e endereço", () => {
    expect(posts.map((p) => p.id)).toEqual([100, 101, 102]);
    const p = posts[1];
    expect(p.text).toContain("Massa Corrida Reveste Mais 23kg Uso Interno");
    expect(p.text).toContain("R$ 69,00");
    expect(p.links).toEqual(["https://meli.la/2dsh2fX"]);
    expect(p.bold).toContain("O QUARTO NOVO COMEÇA COM UMA PAREDE LISINHA!");
    expect(p.bold).not.toContain("🔥"); // emoji não é negrito
    expect(p.imageUrl).toBe("https://cdn1.telesco.pe/file/abc101.jpg");
    expect(p.postedAt?.toISOString()).toBe("2026-10-21T17:19:23.000Z");
    expect(p.postUrl).toBe("https://t.me/canalteste/101");
    expect(posts[2].imageUrl).toBeNull();
  });
  it("canal cadastrado por apelido: lê as publicações da página, que vêm com o nome principal", () => {
    const viaAlias = parseChannelPage(PAGE, "apelidodocanal");
    expect(viaAlias.map((p) => p.id)).toEqual([100, 101, 102]);
    expect(viaAlias[1].postUrl).toBe("https://t.me/canalteste/101");
    expect(channelPageInfo(PAGE, "apelidodocanal").name).toBe("canalteste");
  });
  it("ignora bloco solto de outro canal no meio da página", () => {
    const intruso = msg(5, "x").split("canalteste/").join("intruso/");
    const mixed = PAGE.replace("</section>", `${intruso}</section>`);
    expect(parseChannelPage(mixed, "canalteste").map((p) => p.id)).toEqual([100, 101, 102]);
  });
  it("pega o nome do canal para mostrar no painel", () => {
    const withTitle = PAGE.replace("<html>", `<html><head><meta property="og:title" content="[CANAL] Teste &amp; Cia 💥"></head>`);
    expect(channelPageInfo(withTitle, "canalteste")).toEqual({ name: "canalteste", title: "[CANAL] Teste & Cia 💥" });
    expect(channelLabel(channelPageInfo(withTitle, "canalteste"))).toBe("[CANAL] Teste & Cia 💥 (@canalteste)");
    expect(channelLabel(channelPageInfo(PAGE, "canalteste"))).toBe("@canalteste");
  });
  it("aceita o canal escrito de vários jeitos", () => {
    expect(normalizeChannel("@PromoTop")).toBe("PromoTop");
    expect(normalizeChannel("https://t.me/s/promotop")).toBe("promotop");
    expect(normalizeChannel("t.me/promotop/123")).toBe("promotop");
    expect(normalizeChannel("https://t.me/+AbCdEf")).toBeNull(); // convite de grupo privado
    expect(normalizeChannel("ab")).toBeNull();
  });
});

const post = (text: string, extra: Partial<RawPost> = {}): RawPost => ({
  id: 1, postedAt: null, text, links: [], bold: [], strike: [], imageUrl: null, postUrl: null, ...extra,
});

describe("texto da publicação", () => {
  const posts = parseChannelPage(PAGE, "canalteste");
  it("acha o produto mesmo com frase de chamada em maiúsculas e o preço do 'Por:'", () => {
    const r = parsePost(posts[1]);
    expect(r.title).toBe("Massa Corrida Reveste Mais 23kg Uso Interno");
    expect(r.priceCents).toBe(6900);
    expect(r.listPriceCents).toBeNull();
    expect(r.facts).toContain("Preço à vista.");
  });
  it("prefere a linha do produto em negrito à frase 'oferta exclusiva'", () => {
    const r = parsePost(posts[0]);
    expect(r.title).toBe("Smart TV 50 Philco PTV50G7PR2CSB 4K Roku TV Led Dolby Audio");
    expect(r.priceCents).toBe(179899);
    expect(r.facts).toEqual(expect.arrayContaining(["Exclusivo para membros Prime.", "Preço parcelado."]));
    expect(r.links).toEqual(["https://promosdodia.example/ofertas/smart-tv-50", "https://is.gd/t55rcy"]);
  });
  it("cupom da loja inteira: código, valor e pedido mínimo, sem preço de produto", () => {
    const r = parsePost(posts[2]);
    expect(r.priceCents).toBeNull();
    expect(r.coupon).toMatchObject({ code: "ESQTVSCEL2110", kind: "amount", amountCents: 15000, minOrderCents: 119900 });
    expect(r.coupon?.text).toBe("R$150 OFF em compras acima de R$1.199");
  });
  it("de/por: preço antigo e preço atual", () => {
    const r = parsePost(post("Fone Bluetooth JBL Tune 520BT\nDe R$ 349,90 por R$ 199,90\nEm até 10x de R$ 19,99"));
    expect(r.priceCents).toBe(19990);
    expect(r.listPriceCents).toBe(34990);
  });
  it("preço riscado conta como antigo; parcela e frete não contam como preço", () => {
    const r = parsePost(post("Air Fryer Mondial 4L AFN-40\nR$ 459,90\nR$ 289,90 no Pix\n12x de R$ 26,99\nFrete de R$ 15,00", { strike: ["R$ 459,90"] }));
    expect(r.priceCents).toBe(28990);
    expect(r.listPriceCents).toBe(45990);
    expect(r.facts).toContain("Preço no Pix.");
  });
  it("cupom em porcentagem junto com o produto", () => {
    const r = parsePost(post("Tênis Nike Revolution 7 Masculino\nPor R$ 299,99\nCupom: NIKE10 (10% OFF)"));
    expect(r.priceCents).toBe(29999);
    expect(r.coupon).toMatchObject({ code: "NIKE10", kind: "percent", percent: 10 });
  });
  it("não confunde palavra comum com código de cupom", () => {
    expect(parsePost(post("Cupom Shopee!!!\nR$10 OFF nas compras acima de R$40")).coupon?.code).toBeNull();
  });
  it("tira links do próprio Telegram", () => {
    expect(parsePost(post("x", { links: ["https://t.me/promotop", "https://amzn.to/abc"] })).links).toEqual(["https://amzn.to/abc"]);
  });
});

describe("título da página da loja", () => {
  it("tira o nome da loja do começo ou do fim", () => {
    expect(cleanPageTitle("Dream Fitness EX 450 - Bicicleta Ergométrica Vertical | Amazon.com.br")).toBe("Dream Fitness EX 450 - Bicicleta Ergométrica Vertical");
    expect(cleanPageTitle("Amazon.com.br: Fone JBL Tune 520BT Preto: Eletrônicos")).toBe("Fone JBL Tune 520BT Preto");
    expect(cleanPageTitle("Furadeira Wap 12V | Mercado Livre")).toBe("Furadeira Wap 12V");
    expect(cleanPageTitle("Mercado Livre")).toBeNull();
    expect(cleanPageTitle(null)).toBeNull();
  });
});

describe("título: chamada x nome do produto", () => {
  it("ignora chamada em negrito com ‼ e linha curta de especificação", () => {
    const a = parsePost(post("Possui função de secar e modelar os fios‼️\n\nEscova Secadora Britânia Bivolt 1300w Soft Original\n\n🔥 Por: R$ 89,00 à vista", { bold: ["Possui função de secar e modelar os fios"] }));
    expect(a.title).toBe("Escova Secadora Britânia Bivolt 1300w Soft Original");
    const b = parsePost(post("💻 Ryzen 5, 8GB RAM e 256GB SSD\n\nNotebook Positivo Vision R15m Amd Ryzen 5-5625u 8gb Ram 256gb Ssd Tela 15 Full Hd\n\n🔥 Por: R$ 2.552,03 via Pix", { bold: ["Ryzen 5, 8GB RAM e 256GB SSD"] }));
    expect(b.title).toBe("Notebook Positivo Vision R15m Amd Ryzen 5-5625u 8gb Ram 256gb Ssd Tela 15 Full Hd");
    expect(b.priceCents).toBe(255203);
  });
});

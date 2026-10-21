// Servidor de mentira para os testes de integração: imita a API de afiliados da Shopee (conferindo a assinatura) e a Bot API do Telegram.
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createTcp } from "node:net";

const PORT = Number(process.env.STUB_PORT ?? 4010);
const APP_ID = "app-teste";
const SECRET = "segredo-teste";

const calls = []; // tudo que o site enviou
const mails = []; // e-mails recebidos pelo SMTP de mentira
const SMTP_PORT = Number(process.env.STUB_SMTP_PORT ?? 4025);

// SMTP de mentira: EHLO, AUTH PLAIN (senha "senha-stub"), MAIL, RCPT, DATA, QUIT. Guarda destinatário e corpo.
createTcp((sock) => {
  let mode = "cmd";
  let buf = "";
  let to = [];
  sock.write("220 stub ESMTP\r\n");
  sock.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    for (;;) {
      if (mode === "data") {
        const end = buf.indexOf("\r\n.\r\n");
        if (end === -1) return;
        mails.push({ to: [...to], data: buf.slice(0, end) });
        buf = buf.slice(end + 5);
        to = [];
        mode = "cmd";
        sock.write("250 queued\r\n");
        continue;
      }
      const nl = buf.indexOf("\r\n");
      if (nl === -1) return;
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      const up = line.toUpperCase();
      if (up.startsWith("EHLO") || up.startsWith("HELO")) sock.write("250-stub\r\n250 AUTH PLAIN\r\n");
      else if (up.startsWith("AUTH PLAIN")) {
        const cred = Buffer.from(line.split(" ")[2] ?? "", "base64").toString("utf8");
        sock.write(cred.endsWith("\0senha-stub") ? "235 ok\r\n" : "535 credenciais erradas\r\n");
      } else if (up.startsWith("MAIL FROM")) sock.write("250 ok\r\n");
      else if (up.startsWith("RCPT TO")) { to.push(/<([^>]+)>/.exec(line)?.[1] ?? ""); sock.write("250 ok\r\n"); }
      else if (up === "DATA") { mode = "data"; sock.write("354 go\r\n"); }
      else if (up === "QUIT") { sock.write("221 bye\r\n"); sock.end(); return; }
      else sock.write("250 ok\r\n");
    }
  });
  sock.on("error", () => {});
}).listen(SMTP_PORT, "127.0.0.1");
let conversionSubId = null;

let idBase = Date.now(); // cada rodada de teste usa itens novos: o robô não repete oferta dos últimos 14 dias

const offers = () => [
  { itemId: idBase + 1, productName: "Fone Bluetooth Stub Pro com cancelamento de ruído", price: "99.90", priceMin: "99.90", priceDiscountRate: 40, commissionRate: "0.08", sales: 250, ratingStar: "4.8", imageUrl: "http://127.0.0.1/x.png", shopName: "Loja Stub" },
  { itemId: idBase + 2, productName: "Teclado Mecânico Stub RGB 87 teclas", price: "149.00", priceMin: "149.00", priceDiscountRate: 25, commissionRate: "0.06", sales: 80, ratingStar: "4.5", imageUrl: null, shopName: "Loja Stub" },
  { itemId: idBase + 3, productName: "Produto Stub com desconto pequeno demais", price: "50.00", priceMin: "50.00", priceDiscountRate: 3, commissionRate: "0.05", sales: 500, ratingStar: "4.9", imageUrl: null, shopName: "Loja Stub" },
  { itemId: idBase + 4, productName: "Produto Stub poucas vendas ainda", price: "70.00", priceMin: "70.00", priceDiscountRate: 50, commissionRate: "0.05", sales: 2, ratingStar: "4.9", imageUrl: null, shopName: "Loja Stub" },
].map((o) => ({ ...o, productLink: `https://shopee.com.br/product/1/${o.itemId}`, offerLink: `https://s.shopee.com.br/offer${o.itemId}` }));

function body(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
}

const json = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return json(res, 200, { ok: true });
  if (url.pathname === "/_calls") return json(res, 200, calls);
  if (url.pathname === "/_mails") return json(res, 200, mails);
  if (url.pathname === "/_mails_reset") { mails.length = 0; return json(res, 200, { ok: true }); }
  if (url.pathname === "/v1/messages" && req.method === "POST") {
    if (req.headers["x-api-key"] !== "sk-stub") return json(res, 401, { error: { message: "invalid x-api-key" } });
    const payload = JSON.parse(await body(req));
    const user = String(payload.messages?.[0]?.content ?? "");
    calls.push({ kind: "anthropic.messages", model: payload.model, user });
    const text = user.includes("Reescreva o título") ? "Cupom E2E de 10% de desconto em loja de exemplo" : user.includes("Escreva uma descrição") ? "Cupom de teste da IA. Vale para a primeira compra e não acumula com outras promoções." : "ok";
    return json(res, 200, { content: [{ type: "text", text }] });
  }
  if (url.pathname === "/_reset") { calls.length = 0; conversionSubId = null; idBase = Date.now(); return json(res, 200, { ok: true }); }
  if (url.pathname === "/_conversion" && req.method === "POST") { conversionSubId = JSON.parse(await body(req)).subId; return json(res, 200, { ok: true }); }

  if (url.pathname === "/graphql" && req.method === "POST") {
    const raw = await body(req);
    const auth = String(req.headers.authorization ?? "");
    const m = auth.match(/^SHA256 Credential=([^,]+), Timestamp=(\d+), Signature=([0-9a-f]{64})$/);
    const expected = m ? createHash("sha256").update(`${m[1]}${m[2]}${raw}${SECRET}`).digest("hex") : null;
    if (!m || m[1] !== APP_ID || m[3] !== expected) return json(res, 200, { errors: [{ message: "Invalid Signature" }] });
    const { query, variables } = JSON.parse(raw);
    if (query.includes("productOfferV2")) {
      calls.push({ kind: "shopee.search", keyword: variables.keyword });
      return json(res, 200, { data: { productOfferV2: { nodes: offers() } } });
    }
    if (query.includes("generateShortLink")) {
      calls.push({ kind: "shopee.shortLink", subIds: variables.input.subIds });
      return json(res, 200, { data: { generateShortLink: { shortLink: `https://s.shopee.com.br/stub-${variables.input.subIds[0]}` } } });
    }
    if (query.includes("conversionReport")) {
      const nodes = conversionSubId
        ? [{ purchaseTime: Math.floor(Date.now() / 1000) - 3600, conversionId: `E2E-STUB-${idBase}`, conversionStatus: "PENDING", totalCommission: "7.50", utmContent: conversionSubId, orders: [{ orderId: "O-1", items: [{ actualAmount: "99.90" }] }] }]
        : [];
      return json(res, 200, { data: { conversionReport: { nodes, pageInfo: { hasNextPage: false } } } });
    }
    return json(res, 200, { errors: [{ message: "consulta desconhecida" }] });
  }

  const tg = url.pathname.match(/^\/bot([^/]+)\/(\w+)$/);
  if (tg && req.method === "POST") {
    const [, token, method] = tg;
    if (token !== "123456:stub-token") return json(res, 401, { ok: false, description: "Unauthorized" });
    const payload = JSON.parse((await body(req)) || "{}");
    if (method === "getMe") return json(res, 200, { ok: true, result: { username: "stub_bot" } });
    if (method === "sendMessage" || method === "sendPhoto") {
      calls.push({ kind: `telegram.${method}`, chat: payload.chat_id, text: payload.text ?? payload.caption });
      return json(res, 200, { ok: true, result: { message_id: calls.length } });
    }
  }
  json(res, 404, { error: "não existe" });
}).listen(PORT, "127.0.0.1", () => console.log(`stub na porta ${PORT}`));
import { createServer, type Server } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confirmationMail } from "../lib/newsletter";
import { sendMails, verifySmtp } from "../lib/integrations/smtp";

// Servidor SMTP de mentira: conversa o mínimo (EHLO, AUTH PLAIN, MAIL, RCPT, DATA, QUIT) e guarda o que recebeu.
let server: Server;
let port = 0;
const received: { to: string[]; data: string; auth: string }[] = [];
const rejectFor = "recusado@exemplo.com";

beforeAll(async () => {
  server = createServer((sock) => {
    let mode: "cmd" | "data" = "cmd";
    let buf = "";
    const cur = { to: [] as string[], data: "", auth: "" };
    sock.write("220 sink ESMTP\r\n");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      for (;;) {
        if (mode === "data") {
          const end = buf.indexOf("\r\n.\r\n");
          if (end === -1) return;
          cur.data = buf.slice(0, end);
          buf = buf.slice(end + 5);
          received.push({ to: [...cur.to], data: cur.data, auth: cur.auth });
          cur.to = [];
          mode = "cmd";
          sock.write("250 queued\r\n");
          continue;
        }
        const nl = buf.indexOf("\r\n");
        if (nl === -1) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const up = line.toUpperCase();
        if (up.startsWith("EHLO") || up.startsWith("HELO")) sock.write("250-sink\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (up.startsWith("AUTH PLAIN")) {
          cur.auth = Buffer.from(line.split(" ")[2] ?? "", "base64").toString("utf8").replace(/\0/g, "|");
          sock.write(cur.auth.endsWith("|senha-certa") ? "235 ok\r\n" : "535 credenciais erradas\r\n");
        } else if (up.startsWith("MAIL FROM")) sock.write("250 ok\r\n");
        else if (up.startsWith("RCPT TO")) {
          const rcpt = /<([^>]+)>/.exec(line)?.[1] ?? "";
          if (rcpt === rejectFor) sock.write("550 caixa não existe\r\n");
          else { cur.to.push(rcpt); sock.write("250 ok\r\n"); }
        } else if (up === "DATA") { mode = "data"; sock.write("354 go\r\n"); }
        else if (up === "RSET" || up === "NOOP") sock.write("250 ok\r\n");
        else if (up === "QUIT") { sock.write("221 bye\r\n"); sock.end(); return; }
        else sock.write("502 comando não suportado\r\n");
      }
    });
    sock.on("error", () => {});
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as { port: number }).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const cfg = () => ({ host: "127.0.0.1", port: String(port), user: "ofertas", password: "senha-certa", from: "Site <ofertas@exemplo.com>" });
const mail = confirmationMail({ siteName: "Site", confirmUrl: "https://x.test/boletim/confirmar?t=abc" });

describe("SMTP", () => {
  it("verifica a conexão com a senha certa e recusa a errada", async () => {
    await expect(verifySmtp(cfg())).resolves.toBeUndefined();
    await expect(verifySmtp({ ...cfg(), password: "errada" })).rejects.toThrow();
  });
  it("recusa porta inválida antes de tentar conectar", async () => {
    await expect(verifySmtp({ ...cfg(), port: "abc" })).rejects.toThrow(/porta/i);
  });
  it("envia para vários destinatários e relata quem falhou, sem derrubar o lote", async () => {
    const before = received.length;
    const r = await sendMails(cfg(), [
      { to: "ana@exemplo.com", mail, unsubscribeUrl: "https://x.test/boletim/sair?t=1" },
      { to: rejectFor, mail },
      { to: "bia@exemplo.com", mail },
    ]);
    expect(r.map((x) => x.ok)).toEqual([true, false, true]);
    expect(r[1].error).toMatch(/550|caixa/);
    const got = received.slice(before);
    expect(got.map((g) => g.to[0])).toEqual(["ana@exemplo.com", "bia@exemplo.com"]);
    expect(got[0].data).toContain("List-Unsubscribe: <https://x.test/boletim/sair?t=1>");
    expect(got[0].data).toContain("Subject:");
    expect(got[0].auth).toBe("|ofertas|senha-certa");
  });
});
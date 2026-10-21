// Boletim por e-mail: textos e validação. Sem acesso a banco nem a rede, para testar fácil.
import { formatPrice } from "./format";

export const NEWSLETTER_MAX_DEALS = 8;
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

export const normalizeEmail = (raw: string) => raw.trim().toLowerCase();
export const isValidEmail = (email: string) => email.length <= 254 && EMAIL_RE.test(email);

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type DigestDeal = { title: string; url: string; priceCents: number | null; couponCode: string | null; store: string; discountPct: number | null };
export type Mail = { subject: string; html: string; text: string };

const shell = (siteName: string, body: string, footer: string) =>
  `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#13111c">` +
  `<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(siteName)}</h1>${body}` +
  `<p style="font-size:12px;color:#5b5873;margin-top:24px;border-top:1px solid #e3e1ec;padding-top:12px">${footer}</p></div>`;

export function confirmationMail(o: { siteName: string; confirmUrl: string }): Mail {
  const subject = `Confirme seu e-mail para receber as ofertas da semana`;
  const text = `Para receber o boletim de ofertas de ${o.siteName}, confirme seu e-mail:\n${o.confirmUrl}\n\nSe não foi você, ignore esta mensagem: nada será enviado.`;
  const html = shell(
    o.siteName,
    `<p>Para receber o boletim com as ofertas mais quentes da semana, confirme seu e-mail.</p>` +
      `<p><a href="${escapeHtml(o.confirmUrl)}" style="display:inline-block;background:#6d28d9;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Confirmar e-mail</a></p>`,
    `Se não foi você, ignore esta mensagem: nada será enviado.`,
  );
  return { subject, html, text };
}

export function digestMail(o: { siteName: string; siteUrl: string; deals: DigestDeal[]; unsubscribeUrl: string }): Mail {
  const deals = o.deals.slice(0, NEWSLETTER_MAX_DEALS);
  const subject = deals.length === 1 ? "A oferta mais quente da semana" : `As ${deals.length} ofertas mais quentes da semana`;
  const line = (d: DigestDeal) => {
    const what = d.priceCents != null ? formatPrice(d.priceCents) : d.couponCode ? `cupom ${d.couponCode}` : "";
    const off = d.discountPct && d.discountPct > 0 ? ` (-${d.discountPct}%)` : "";
    return { title: d.title, what: `${what}${off}`.trim(), store: d.store, url: d.url };
  };
  const rows = deals.map(line);
  const html = shell(
    o.siteName,
    `<p>As ofertas que a comunidade mais aprovou nesta semana:</p>` +
      rows
        .map(
          (r) =>
            `<p style="margin:0 0 14px"><a href="${escapeHtml(r.url)}" style="color:#6d28d9;font-weight:bold;text-decoration:none">${escapeHtml(r.title)}</a><br>` +
            `<span style="color:#157a3a;font-weight:bold">${escapeHtml(r.what)}</span> <span style="color:#5b5873">· ${escapeHtml(r.store)}</span></p>`,
        )
        .join("") +
      `<p><a href="${escapeHtml(o.siteUrl)}" style="color:#6d28d9">Ver todas as ofertas</a></p>`,
    `Alguns links nos pagam comissão quando você compra; isso não muda o preço nem a ordem. ` +
      `Não quer mais receber? <a href="${escapeHtml(o.unsubscribeUrl)}" style="color:#5b5873">Cancelar a inscrição</a>.`,
  );
  const text =
    `As ofertas que a comunidade mais aprovou nesta semana:\n\n` +
    rows.map((r) => `${r.title}\n${r.what} · ${r.store}\n${r.url}`).join("\n\n") +
    `\n\nVer todas: ${o.siteUrl}\n\nCancelar a inscrição: ${o.unsubscribeUrl}`;
  return { subject, html, text };
}
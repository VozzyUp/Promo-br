import { NextResponse } from "next/server";
import { getDealByCode, recordClick } from "@/lib/data";
import { isLikelyBot, visitorHash } from "@/lib/auth";

const CHANNELS = new Set(["site", "telegram", "whatsapp", "instagram", "other"]);

/** Registra o clique (1 por visitante/oferta/dia, sem bots) e manda para o link do autor, sem alterar. */
export async function GET(request: Request, ctx: RouteContext<"/ir/[code]">) {
  const { code } = await ctx.params;
  const deal = await getDealByCode(code);
  if (!deal || (deal.status !== "published" && deal.status !== "expired")) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
  if (deal.status === "expired") {
    return NextResponse.redirect(new URL(`/oferta/${deal.slug}`, request.url), 302);
  }
  const c = new URL(request.url).searchParams.get("c") ?? "site";
  if (!(await isLikelyBot())) {
    await recordClick(deal.id, await visitorHash(), CHANNELS.has(c) ? c : "other");
  }
  const res = NextResponse.redirect(deal.urlSubmitted, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

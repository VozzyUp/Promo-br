import { NextResponse } from "next/server";
import { redirectToPath } from "@/lib/redirect";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/supabase/db";
import { supabaseAuth } from "@/lib/supabase/server";

/** LGPD: entrega ao titular uma cópia dos dados da própria conta, em JSON. */
export async function GET() {
  const session = await getSession();
  if (!session) return redirectToPath("/entrar?next=/conta/exportar");

  const d = db();
  const uid = session.userId;
  const [profile, deals, comments, votes, alerts, notifications, settings, points, auth] = await Promise.all([
    d.from("profiles").select("username, display_name, role, reputation, trusted, approved_posts, created_at").eq("id", uid).maybeSingle(),
    d.from("deals").select("id, slug, title, description, url_submitted, price_cents, list_price_cents, coupon_code, status, created_at, published_at").eq("author_id", uid),
    d.from("comments").select("id, deal_id, parent_id, body, status, created_at").eq("user_id", uid),
    d.from("votes").select("deal_id, value, created_at").eq("user_id", uid),
    d.from("alerts").select("keyword, max_price_cents, category_id, active, created_at").eq("user_id", uid),
    d.from("notifications").select("kind, data, read_at, created_at").eq("user_id", uid).order("id", { ascending: false }).limit(500),
    d.from("user_settings").select("prefs").eq("user_id", uid).maybeSingle(),
    d.from("reputation_events").select("kind, points, created_at").eq("user_id", uid),
    (await supabaseAuth()).auth.getUser(),
  ]);

  // Nunca entregar uma cópia incompleta como se estivesse completa.
  const failed = [profile, deals, comments, votes, alerts, notifications, settings, points].find((r) => r.error);
  if (failed?.error) {
    console.error("[export]", failed.error);
    return NextResponse.json({ error: "Não foi possível gerar seus dados agora. Tente de novo em instantes." }, { status: 500 });
  }

  const payload = {
    gerado_em: new Date().toISOString(),
    aviso: "Cópia dos dados da sua conta no PromoValeu. Guarde com cuidado: contém seu e-mail e suas atividades.",
    conta: { email: auth.data.user?.email ?? null, ...(profile.data ?? {}) },
    ofertas_publicadas: deals.data ?? [],
    comentarios: comments.data ?? [],
    votos: votes.data ?? [],
    alertas: alerts.data ?? [],
    notificacoes: notifications.data ?? [],
    preferencias: (settings.data as { prefs: unknown } | null)?.prefs ?? {},
    pontos: points.data ?? [],
  };

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="promovaleu-meus-dados-${day}.json"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

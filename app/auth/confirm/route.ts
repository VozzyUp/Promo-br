// Destino dos links enviados por e-mail (confirmar conta, recuperar senha).
// Aceita o formato token_hash (funciona em qualquer aparelho) e o formato code (PKCE, mesmo navegador).
import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAuth, supabaseEnabled } from "@/lib/supabase/server";
import { safeNext } from "@/lib/links";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change", "magiclink"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const fail = NextResponse.redirect(new URL("/entrar?erro=link", origin));
  if (!supabaseEnabled()) return fail;

  const supabase = await supabaseAuth();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  let ok = false;
  if (tokenHash && type && TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }
  if (!ok) return fail;

  const dest = type === "recovery" ? "/nova-senha" : next;
  return NextResponse.redirect(new URL(dest, origin));
}

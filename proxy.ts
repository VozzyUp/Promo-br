// Renova o token do Supabase Auth a cada requisição (os Server Components não podem gravar cookies).
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // Não colocar código entre createServerClient e getClaims: é aqui que o token expirado é trocado.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Fora: arquivos estáticos, imagens e o redirecionamento /ir/ (não precisa de sessão e tem de ser rápido).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ir/|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

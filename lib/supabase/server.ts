// Clientes Supabase do servidor. O navegador nunca recebe a chave secreta.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function supabaseEnabled() {
  // Sem a chave secreta o servidor não lê nem grava: fica na camada em memória.
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

function url() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurado");
  return v;
}

/** Cliente com a sessão do visitante (cookies). Usado só para Auth: entrar, sair, cadastrar, trocar senha. */
export async function supabaseAuth() {
  const store = await cookies();
  return createServerClient(url(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Chamado de um Server Component: o proxy.ts renova os cookies na próxima requisição.
        }
      },
    },
  });
}

let admin: ReturnType<typeof createClient> | undefined;

/** Cliente com a chave secreta: ignora RLS. Toda escrita passa por aqui, depois da checagem de papel no código. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY não configurado");
  admin ??= createClient(url(), key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

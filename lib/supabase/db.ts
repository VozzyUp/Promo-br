// Cliente do banco sem tipos gerados. Cada módulo de dados tipa as linhas que lê.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; as linhas são tipadas em cada módulo
export type AnyDb = SupabaseClient<any, "public", any>;

export const db = () => supabaseAdmin() as unknown as AnyDb;

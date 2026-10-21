// Ponto único de acesso a dados. Com NEXT_PUBLIC_SUPABASE_URL configurado usa o Supabase;
// sem ele, a camada em memória (desenvolvimento sem banco). As duas têm as mesmas assinaturas.
import "server-only";
import * as memory from "./memory";
import * as supabase from "./supabase";
import { supabaseEnabled } from "../supabase/server";

// Só o que a camada em memória também oferece; o restante do supabase.ts é importado direto pelos módulos novos.
type DataApi = Pick<
  typeof supabase,
  | "listFeed" | "listHot" | "getDealBySlug" | "getDealByCode" | "listCategories" | "listStores" | "getProfile"
  | "isUsernameTaken" | "listPendingDeals" | "recordClick" | "createStoreForHost" | "createDeal"
  | "countDealsByAuthorSince" | "moderateDeal" | "vote"
>;

const impl: DataApi = supabaseEnabled() ? supabase : memory;

export const {
  listFeed,
  listHot,
  getDealBySlug,
  getDealByCode,
  listCategories,
  listStores,
  getProfile,
  isUsernameTaken,
  listPendingDeals,
  recordClick,
  createStoreForHost,
  createDeal,
  countDealsByAuthorSince,
  moderateDeal,
  vote,
} = impl;
export type { NewDeal } from "./supabase";

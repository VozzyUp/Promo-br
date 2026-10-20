// Ponto único de acesso a dados. Hoje: camada em memória. Em /replica-backend: Supabase, mesmas assinaturas.
import "server-only";

export {
  listFeed,
  listHot,
  getDealBySlug,
  getDealByCode,
  listCategories,
  listStores,
  getProfile,
  listPendingDeals,
  recordClick,
  createStoreForHost,
  createDeal,
  countDealsByAuthorSince,
  moderateDeal,
  vote,
  createUser,
  authenticate,
} from "./memory";
export type { NewDeal } from "./memory";

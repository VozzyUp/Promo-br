// Tipos do domínio. Espelham replica/schema.sql (dinheiro em centavos, desconto em pontos-base, datas ISO UTC).

export type Role = "user" | "moderator" | "admin" | "system";

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  reputation: number;
  trusted: boolean;
  approvedPosts: number;
  bannedAt: string | null;
  createdAt: string;
};

export type Store = {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  status: "active" | "pending_review" | "blocked";
};

export type Category = { id: string; name: string; slug: string };

export type DealStatus = "pending" | "published" | "expired" | "rejected" | "removed";
export type Verdict = "pending" | "verified" | "good_price" | "no_comparison" | "inflated";
export type DealSource = "user" | "admin" | "robot";

export type Deal = {
  id: string;
  slug: string;
  code: string;
  title: string;
  description: string;
  authorId: string;
  source: DealSource;
  storeId: string;
  categoryId: string | null;
  urlSubmitted: string;
  priceCents: number | null; // null em cupons sem preço
  listPriceCents: number | null;
  couponCode: string | null;
  couponPercent: number | null;
  imageUrl: string | null;
  verdict: Verdict;
  realDiscountBp: number | null;
  status: DealStatus;
  rejectReason: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  votesUp: number;
  votesDown: number;
  clicksTotal: number;
  commentsCount: number;
  createdAt: string;
};

export type DealView = Deal & {
  store: Store;
  category: Category | null;
  author: Pick<Profile, "id" | "username" | "displayName" | "avatarUrl" | "role">;
  temperature: number;
  myVote: -1 | 0 | 1;
};

export type FeedTab = "paravoce" | "quentes" | "descontos" | "novas";

export type Session = { userId: string; role: Role; username: string };

export type CommentReaction = "like" | "helpful" | "haha";

export type CommentView = {
  id: string;
  dealId: string | null;
  threadId: string | null;
  parentId: string | null;
  body: string;
  removed: boolean;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null; role: Role } | null;
  likes: number;
  helpful: number;
  haha: number;
  mine: CommentReaction | null;
  replies: CommentView[];
};

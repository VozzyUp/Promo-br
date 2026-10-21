"use server";

import { createElement, Fragment, type ReactNode } from "react";
import { DealCard } from "@/components/deal-card";
import { AdSlot } from "@/components/sidebar";
import { getSession } from "@/lib/auth";
import { listFeedPage } from "@/lib/data/feed";
import { savedSet } from "@/lib/data/relations";
import type { FeedTab } from "@/lib/types";

const TABS: FeedTab[] = ["paravoce", "quentes", "descontos", "novas"];
const AD_EVERY = 4;
const PAGE = 20;

/** Próxima página do feed, já desenhada no servidor (cartões e anúncios). */
export async function loadMoreFeedAction(tab: string, offset: number): Promise<{ node: ReactNode; next: number | null }> {
  const session = await getSession();
  const t = (TABS as string[]).includes(tab) ? (tab as FeedTab) : "quentes";
  const off = Number.isFinite(offset) && offset >= 0 && offset <= 2000 ? Math.floor(offset) : 0;
  const { items, nextOffset } = await listFeedPage({ tab: t, viewerId: session?.userId ?? null, limit: PAGE, offset: off });
  const saved = session ? await savedSet(session.userId, items.map((d) => d.id)) : new Set<string>();
  const node = createElement(
    Fragment,
    null,
    ...items.map((deal, i) =>
      createElement(
        "div",
        { key: deal.id, className: "contents" },
        createElement(DealCard, { deal, loggedIn: !!session, saved: saved.has(deal.id) }),
        (off + i + 1) % AD_EVERY === 0 ? createElement(AdSlot, {}) : null,
      ),
    ),
  );
  return { node, next: nextOffset };
}

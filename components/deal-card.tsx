import Link from "next/link";
import { CouponCTA } from "@/components/coupon-cta";
import { ActionBar, DealImage, GoToDealLink, PriceBlock, StoreAndAuthor, TimeChip } from "@/components/deal-parts";
import { TemperatureVote } from "@/components/temperature-vote";
import { stripRichText } from "@/lib/rich-text";
import type { DealView } from "@/lib/types";

export function DealCard({ deal, loggedIn }: { deal: DealView; loggedIn: boolean }) {
  const titleId = `t-${deal.id}`;
  const expired = deal.status === "expired";
  return (
    <article
      aria-labelledby={titleId}
      className={`group flex overflow-hidden rounded-card bg-bg shadow-card transition-shadow hover:shadow-card-hover ${expired ? "opacity-60" : ""}`}
    >
      <div className="flex shrink-0 items-start bg-surface p-3 sm:items-center sm:p-4">
        <Link href={`/oferta/${deal.slug}`} tabIndex={-1} aria-hidden>
          <DealImage deal={deal} />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <TemperatureVote dealId={deal.id} initial={{ temperature: deal.temperature, myVote: deal.myVote }} loggedIn={loggedIn} />
          {deal.publishedAt ? <TimeChip iso={deal.publishedAt} /> : null}
        </div>
        <h2 id={titleId} className="text-title font-bold">
          <Link href={`/oferta/${deal.slug}`} className="line-clamp-2 group-hover:text-accent">{deal.title}</Link>
        </h2>
        <PriceBlock deal={deal} />
        <StoreAndAuthor deal={deal} />
        {deal.description ? <p className="line-clamp-3 text-sm text-muted">{stripRichText(deal.description, 240)}</p> : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <ActionBar deal={deal} />
          {expired ? (
            <span className="rounded-pill bg-surface px-4 py-2 text-sm font-bold text-muted">Acabou</span>
          ) : deal.couponCode ? (
            <CouponCTA code={deal.code} couponCode={deal.couponCode} />
          ) : (
            <GoToDealLink code={deal.code} />
          )}
        </div>
      </div>
    </article>
  );
}

export function DealCardSkeleton() {
  return (
    <div className="flex animate-pulse overflow-hidden rounded-card bg-bg shadow-card" aria-hidden>
      <div className="bg-surface p-4"><div className="size-24 rounded-xs bg-border sm:size-(--card-image)" /></div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-9 w-32 rounded-pill bg-surface" />
        <div className="h-6 w-3/4 rounded-sm bg-surface" />
        <div className="h-8 w-40 rounded-sm bg-surface" />
        <div className="h-4 w-1/2 rounded-sm bg-surface" />
      </div>
    </div>
  );
}

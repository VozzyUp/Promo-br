import Link from "next/link";
import { CouponCTA } from "@/components/coupon-cta";
import { ActionBar, DealImage, GoToDealLink, PriceBlock, SponsoredChip, StoreAndAuthor, TimeChip } from "@/components/deal-parts";
import { TemperatureVote } from "@/components/temperature-vote";
import { stripRichText } from "@/lib/rich-text";
import type { DealView } from "@/lib/types";

/**
 * Cartão da oferta. Uma só cópia de cada peça; a grade muda de lugar no celular:
 * coluna da esquerda com voto, imagem e ações; à direita o resto, com o botão ocupando a largura.
 */
export function DealCard({ deal, loggedIn, saved = false }: { deal: DealView; loggedIn: boolean; saved?: boolean }) {
  const titleId = `t-${deal.id}`;
  const expired = deal.status === "expired";
  return (
    <article
      aria-labelledby={titleId}
      className={[
        "group relative isolate grid overflow-hidden rounded-card bg-bg shadow-card transition-shadow hover:shadow-card-hover",
        // celular
        "grid-cols-[128px_minmax(0,1fr)] [grid-template-areas:'vote_chip'_'image_title'_'image_price'_'image_meta'_'actions_cta']",
        // a partir de sm: coluna da imagem larga, conteúdo e botão à direita
        "sm:grid-cols-[calc(var(--card-image)+2rem)_minmax(0,1fr)_auto] sm:[grid-template-areas:'image_vote_chip'_'image_title_title'_'image_price_price'_'image_meta_meta'_'image_desc_desc'_'image_actions_cta']",
        "before:absolute before:inset-y-0 before:left-0 before:-z-10 before:w-[128px] before:bg-surface before:content-[''] sm:before:w-[calc(var(--card-image)+2rem)]",
        expired ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className={`[grid-area:vote] flex items-center justify-center p-2 pt-3 sm:justify-start sm:p-0 sm:pl-4 sm:pt-4`}>
        <TemperatureVote dealId={deal.id} initial={{ temperature: deal.temperature, myVote: deal.myVote }} loggedIn={loggedIn} />
      </div>
      <div className={`[grid-area:chip] flex items-center justify-end p-2 pr-3 pt-3 sm:p-0 sm:pr-4 sm:pt-4`}>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {deal.isSponsored ? <SponsoredChip /> : null}
          {deal.publishedAt ? <TimeChip iso={deal.publishedAt} /> : null}
        </div>
      </div>
      <div className={`[grid-area:image] flex items-center justify-center p-3 sm:p-4`}>
        <Link href={`/oferta/${deal.slug}`} tabIndex={-1} aria-hidden>
          <DealImage deal={deal} />
        </Link>
      </div>
      <h2 id={titleId} className={`[grid-area:title] min-w-0 px-3 pt-1 text-title font-bold sm:px-4 sm:pt-2`}>
        <Link href={`/oferta/${deal.slug}`} className="line-clamp-3 group-hover:text-accent sm:line-clamp-2">{deal.title}</Link>
      </h2>
      <div className={`[grid-area:price] px-3 pt-1 sm:px-4 sm:pt-2`}><PriceBlock deal={deal} /></div>
      <div className={`[grid-area:meta] px-3 pt-1 sm:px-4 sm:pt-2`}><StoreAndAuthor deal={deal} /></div>
      {deal.description ? (
        <p className={`[grid-area:desc] hidden px-4 pt-2 line-clamp-3 text-sm text-muted sm:block`}>{stripRichText(deal.description, 240)}</p>
      ) : null}
      <div className={`[grid-area:actions] flex items-center justify-center p-2 sm:justify-start sm:p-0 sm:pb-4 sm:pl-4 sm:pt-3`}>
        <ActionBar deal={deal} saved={saved} loggedIn={loggedIn} />
      </div>
      <div className={`[grid-area:cta] flex items-center justify-stretch px-3 py-3 sm:justify-end sm:px-4 sm:pt-3`}>
        {expired ? (
          <span className="w-full rounded-pill bg-surface px-4 py-2 text-center text-sm font-bold text-muted sm:w-auto">Acabou</span>
        ) : deal.couponCode ? (
          <CouponCTA code={deal.code} couponCode={deal.couponCode} />
        ) : (
          <GoToDealLink code={deal.code} />
        )}
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
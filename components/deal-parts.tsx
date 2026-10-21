// Peças pequenas do card e da página de oferta.
import { BadgeCheck, CircleHelp, Clock, ExternalLink, MessageSquare, Tag } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { discountPercent, endsWithinHours, formatPrice, fullDate, timeAgo } from "@/lib/format";
import type { DealView, Verdict } from "@/lib/types";

export function DealImage({ deal, size = "card" }: { deal: Pick<DealView, "imageUrl" | "title" | "store">; size?: "card" | "page" | "mini" }) {
  const dims = size === "page" ? "size-full min-h-64" : size === "mini" ? "size-[100px]" : "size-24 sm:size-(--card-image)";
  if (deal.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- trocar por next/image quando o storage existir
    return <img src={deal.imageUrl} alt={deal.title} className={`${dims} rounded-xs object-contain`} />;
  }
  return (
    <div className={`${dims} grid place-items-center rounded-xs bg-surface text-center`} role="img" aria-label={`Sem imagem: ${deal.title}`}>
      <span className="px-2 text-sm font-bold text-muted">{deal.store.name}</span>
    </div>
  );
}

export function TimeChip({ iso, prefix = "Publicado" }: { iso: string; prefix?: string }) {
  return (
    <time dateTime={iso} title={fullDate(iso)} className="whitespace-nowrap rounded-sm bg-surface px-2 py-1 text-xs text-muted sm:text-sm">
      {prefix} {timeAgo(iso)}
    </time>
  );
}

export function PriceBlock({ deal, size = "card" }: { deal: DealView; size?: "card" | "page" }) {
  if (deal.priceCents == null) {
    return deal.couponPercent ? (
      <span className={`${size === "page" ? "text-xl" : "text-price"} font-bold text-price`}>-{deal.couponPercent}%</span>
    ) : null;
  }
  const inflated = deal.verdict === "inflated";
  const pct = deal.realDiscountBp != null ? Math.round(deal.realDiscountBp / 100) : discountPercent(deal.priceCents, deal.listPriceCents);
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`${size === "page" ? "text-xl" : "text-price"} font-bold text-price`}>{formatPrice(deal.priceCents)}</span>
      {deal.listPriceCents && !inflated ? (
        <s className="text-sm text-muted"><span className="sr-only">preço anterior </span>{formatPrice(deal.listPriceCents)}</s>
      ) : null}
      {pct && pct > 0 ? <DiscountChip pct={pct} /> : null}
      <VerifyBadge verdict={deal.verdict} />
    </div>
  );
}

export function DiscountChip({ pct }: { pct: number }) {
  return <span className="rounded-xs bg-price-soft px-1.5 py-0.5 text-sm font-bold text-price">-{pct}%</span>;
}

const verdicts: Partial<Record<Verdict, { label: string; tip: string; className: string; Icon: typeof BadgeCheck }>> = {
  verified: { label: "Desconto verificado", tip: "Está no menor preço que registramos nos últimos 30 dias, com pelo menos 10% abaixo do preço de costume.", className: "text-price", Icon: BadgeCheck },
  good_price: { label: "Bom preço", tip: "Está abaixo do preço de costume que registramos, mas a diferença é pequena.", className: "text-info", Icon: Tag },
  inflated: { label: "Desconto inflado", tip: "O preço anterior informado está bem acima do que costuma custar; o desconto real é pequeno.", className: "text-danger", Icon: CircleHelp },
  no_comparison: { label: "Sem comparação", tip: "Ainda não temos histórico suficiente deste produto para comparar.", className: "text-muted", Icon: CircleHelp },
};

export function VerifyBadge({ verdict }: { verdict: Verdict }) {
  const v = verdicts[verdict];
  if (!v) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-bold ${v.className}`} title={v.tip}>
      <v.Icon className="size-4" aria-hidden /> {v.label}
    </span>
  );
}

export function StoreAndAuthor({ deal }: { deal: DealView }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span>Disponível em <strong className="text-text">{deal.store.name}</strong></span>
      <span className="flex items-center gap-1.5">
        <span className="grid size-5 place-items-center rounded-pill bg-surface text-xs font-bold" aria-hidden>
          {deal.author.displayName.slice(0, 1).toUpperCase()}
        </span>
        Postado por {deal.author.username}
      </span>
    </p>
  );
}

export function ActionBar({ deal, saved = false, loggedIn = false }: { deal: DealView; saved?: boolean; loggedIn?: boolean }) {
  return (
    <div className="flex items-center gap-1 text-sm text-muted">
      <a href={`/oferta/${deal.slug}#comentarios`} className="flex h-9 items-center gap-1 rounded-sm px-2 hover:bg-surface">
        <MessageSquare className="size-4" aria-hidden /> {deal.commentsCount}
        <span className="sr-only">comentários</span>
      </a>
      <ShareButton path={`/oferta/${deal.slug}`} title={deal.title} />
      <SaveButton dealId={deal.id} saved={saved} loggedIn={loggedIn} />
    </div>
  );
}

export function ExpiryBanner({ iso }: { iso: string }) {
  const soon = endsWithinHours(iso, 24);
  return (
    <p className={`flex items-center justify-center gap-2 rounded-sm px-4 py-3 text-sm ${soon ? "bg-bg text-danger" : "bg-info-soft text-info"}`}>
      <Clock className="size-4" aria-hidden /> Vence {fullDate(iso)}
    </p>
  );
}

export function GoToDealLink({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  return (
    <a
      href={`/ir/${code}`}
      target="_blank"
      rel="sponsored noopener"
      className={`inline-flex items-center justify-center gap-2 rounded-pill bg-accent px-6 font-bold text-on-accent hover:bg-accent-hover ${size === "lg" ? "h-14 w-full text-base" : "h-10 text-sm"}`}
    >
      Ir para a oferta <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

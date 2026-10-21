import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, Info } from "lucide-react";
import { CouponCTA } from "@/components/coupon-cta";
import { ActionBar, DealImage, ExpiryBanner, GoToDealLink, PriceBlock, TimeChip } from "@/components/deal-parts";
import { TemperatureVote } from "@/components/temperature-vote";
import { AdSlot } from "@/components/sidebar";
import { FormMessage } from "@/components/ui/field";
import { getDealBySlug } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { CommentSection } from "@/components/comments/comment-section";
import { DealToolbar } from "@/components/deal-toolbar";
import { isSubscribed, listComments } from "@/lib/data/comments";
import { savedSet } from "@/lib/data/relations";
import { isFuture } from "@/lib/format";
import { DealGallery } from "@/components/deal-gallery";
import { listDealGallery } from "@/lib/data/publish";
import { supabaseEnabled } from "@/lib/supabase/server";
import { RichText } from "@/lib/rich-text";
import { PriceHistory } from "@/components/price-history";
import { dealJsonLd, jsonLdScript } from "@/lib/structured-data";
import { getPriceHistory } from "@/lib/data/verification";

export async function generateMetadata({ params }: PageProps<"/oferta/[slug]">) {
  const { slug } = await params;
  const session = await getSession();
  const deal = await getDealBySlug(slug, session ? { id: session.userId, role: session.role } : null);
  return { title: deal?.title ?? "Oferta não encontrada" };
}

export default async function DealPage({ params, searchParams }: PageProps<"/oferta/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await getSession();
  const deal = await getDealBySlug(slug, session ? { id: session.userId, role: session.role } : null);
  if (!deal) notFound();

  const history = supabaseEnabled() ? await getPriceHistory(deal.id).catch(() => []) : [];
  const jsonLd = dealJsonLd(deal, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  const expired = deal.status === "expired";
  const live = deal.status === "published" || expired;
  const [thread, subscribed] = live
    ? await Promise.all([
        listComments({ dealId: deal.id }, session?.userId ?? null, sp.ordem === "novos" ? "desc" : "asc"),
        session ? isSubscribed(deal.id, session.userId) : Promise.resolve(false),
      ])
    : [null, false];
  const saved = session ? (await savedSet(session.userId, [deal.id])).has(deal.id) : false;
  const gallery = supabaseEnabled() ? await listDealGallery(deal.id) : [];
  const canClose = !!session && (session.userId === deal.authorId || session.role === "admin" || session.role === "moderator");
  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-4">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} /> : null}
      <nav aria-label="Trilha" className="flex items-center gap-1 text-sm text-muted">
        <Link href="/" className="hover:text-text">Início</Link>
        {deal.category ? (
          <>
            <ChevronRight className="size-3" aria-hidden />
            <Link href={`/c/${deal.category.slug}`} className="hover:text-text">{deal.category.name}</Link>
          </>
        ) : null}
      </nav>

      {sp.enviada && deal.status === "pending" ? (
        <FormMessage tone="info">
          Recebemos sua oferta. Ela aparece para todos assim que a moderação aprovar. Depois de algumas ofertas aprovadas,
          as suas passam a sair na hora.
        </FormMessage>
      ) : null}
      {sp.enviada && deal.status === "published" ? <FormMessage tone="success">Sua oferta está no ar.</FormMessage> : null}
      {deal.status === "rejected" ? <FormMessage>Esta oferta não foi aprovada{deal.rejectReason ? `: ${deal.rejectReason}` : "."}</FormMessage> : null}

      <article aria-labelledby="deal-title" className="flex flex-col gap-4 rounded-card bg-bg p-4 shadow-card md:p-6">
        {deal.expiresAt ? <ExpiryBanner iso={deal.expiresAt} /> : null}
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="md:w-80 md:shrink-0">
            {gallery.length > 1 ? <DealGallery images={gallery} title={deal.title} /> : <DealImage deal={deal} size="page" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {deal.status === "published" ? (
                <TemperatureVote dealId={deal.id} initial={{ temperature: deal.temperature, myVote: deal.myVote }} loggedIn={!!session} />
              ) : (
                <span className="rounded-pill bg-surface px-3 py-1.5 text-sm font-bold text-muted">
                  {deal.status === "pending" ? "Aguardando moderação" : expired ? "Acabou" : "Fora do ar"}
                </span>
              )}
              <ActionBar deal={deal} saved={saved} loggedIn={!!session} />
            </div>
            {deal.publishedAt ? <div><TimeChip iso={deal.publishedAt} /></div> : null}
            <h1 id="deal-title" className="text-xl font-bold">{deal.title}</h1>
            <PriceBlock deal={deal} size="page" />
            <p className="text-sm text-muted">
              Disponível em <strong className="text-text">{deal.store.name}</strong>
              {deal.availability === "offline" ? " · loja física" : ""}
              {deal.shipsFrom ? ` · ${deal.availability === "offline" ? "" : "enviado de "}${deal.shipsFrom}` : ""}
              {deal.shippingCents != null ? ` · ${deal.shippingCents === 0 ? "frete grátis" : `frete ${(deal.shippingCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}` : ""}
            </p>
            {deal.startsAt && isFuture(deal.startsAt) ? (
              <p className="text-sm font-bold text-warning">Começa em {new Date(deal.startsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</p>
            ) : null}
            {deal.couponCode ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold">Código do cupom</span>
                <code className="w-fit rounded-sm border-2 border-dashed border-border-input px-3 py-2 font-mono text-base">{deal.couponCode}</code>
              </div>
            ) : null}
            <div className="mt-2">
              {expired || deal.status !== "published" ? null : deal.couponCode ? (
                <CouponCTA code={deal.code} couponCode={deal.couponCode} size="lg" />
              ) : (
                <GoToDealLink code={deal.code} size="lg" />
              )}
            </div>
          </div>
        </div>
      </article>

      {deal.status === "published" ? (
        <section className="flex flex-col gap-3 rounded-card bg-bg p-4 shadow-card sm:flex-row sm:items-center sm:justify-between md:p-6">
          <p className="text-title font-bold">Vale a pena? Seu voto ajuda outros caçadores a decidir.</p>
          <TemperatureVote dealId={deal.id} initial={{ temperature: deal.temperature, myVote: deal.myVote }} loggedIn={!!session} />
        </section>
      ) : null}

      <PriceHistory points={history} />

      <AdSlot minHeight={120} />

      <section aria-labelledby="sobre-title" className="flex flex-col gap-4 rounded-card bg-bg p-4 shadow-card md:p-6">
        <h2 id="sobre-title" className="text-title font-bold">{deal.couponCode && deal.priceCents == null ? "Sobre este cupom" : "Sobre esta oferta"}</h2>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-pill bg-surface font-bold" aria-hidden>
            {deal.author.displayName.slice(0, 1).toUpperCase()}
          </span>
          <p className="text-sm">
            Postado por <Link href={`/u/${deal.author.username}`} className="font-bold hover:text-accent">{deal.author.username}</Link>
          </p>
        </div>
        {deal.description ? <RichText text={deal.description} className="text-base" /> : <p className="text-sm text-muted">O autor não deixou detalhes.</p>}
        {deal.status === "published" ? (
          <DealToolbar dealId={deal.id} hasCoupon={!!deal.couponCode} canClose={canClose} loggedIn={!!session} />
        ) : null}
        <a href={`/ir/${deal.code}`} target="_blank" rel="sponsored noopener" className="flex w-fit items-center gap-1.5 text-sm font-bold text-accent">
          Ver na {deal.store.name} <ExternalLink className="size-4" aria-hidden /><span className="sr-only">(abre em nova aba)</span>
        </a>
        <p className="flex gap-2 border-t border-border pt-4 text-xs italic text-muted">
          <Info className="size-4 shrink-0" aria-hidden />
          Alguns links nos pagam comissão, ou pagam ao autor da oferta, quando você compra. Isso não muda o que aparece aqui.
        </p>
      </section>

      {thread ? (
        <CommentSection
          dealId={deal.id}
          basePath={`/oferta/${deal.slug}`}
          comments={thread.comments}
          total={thread.total}
          order={sp.ordem === "novos" ? "desc" : "asc"}
          loggedIn={!!session}
          viewerId={session?.userId ?? null}
          viewerRole={session?.role ?? null}
          subscribed={subscribed}
        />
      ) : null}
    </div>
  );
}

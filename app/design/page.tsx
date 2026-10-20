// Vitrine dos primitivos (checagem do design system). Não aparece no menu e não é indexada.
import { CouponCTA } from "@/components/coupon-cta";
import { DealCard, DealCardSkeleton } from "@/components/deal-card";
import { DiscountChip, ExpiryBanner, GoToDealLink, TimeChip, VerifyBadge } from "@/components/deal-parts";
import { AdSlot, EmptyState } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import type { DealView } from "@/lib/types";

export const metadata = { title: "Design", robots: { index: false } };

const now = new Date().toISOString();
const inThreeDays = new Date(Date.now() + 3 * 86400_000).toISOString();
const inThreeHours = new Date(Date.now() + 3 * 3600_000).toISOString();
const sample: DealView = {
  id: "demo", slug: "demo", code: "demo", title: "Exemplo de título de oferta com sessenta caracteres para testar quebras de linha",
  description: "Descrição de exemplo para ver o corte em três linhas quando o texto fica comprido demais para o card.",
  authorId: "x", source: "user", storeId: "x", categoryId: null, urlSubmitted: "https://exemplo.com",
  priceCents: 129990, listPriceCents: 199990, couponCode: null, couponPercent: null, imageUrl: null,
  verdict: "verified", realDiscountBp: 3500, status: "published", rejectReason: null, publishedAt: now, expiresAt: null,
  votesUp: 30, votesDown: 2, clicksTotal: 0, commentsCount: 4, createdAt: now,
  store: { id: "x", name: "Loja Exemplo", slug: "x", domains: [], status: "active" },
  category: null, author: { id: "x", username: "exemplo", displayName: "Exemplo", avatarUrl: null, role: "user" },
  temperature: 280, myVote: 0,
};

const swatches = ["bg", "page", "surface", "border", "border-input", "text", "muted", "accent", "accent-hover", "accent-soft", "price", "price-soft", "hot", "cold", "info", "info-soft", "danger", "warning"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-10 px-4 py-8">
      <h1 className="text-display font-bold">Design system</h1>

      <Section title="Cores (papéis)">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {swatches.map((s) => (
            <div key={s} className="rounded-sm border border-border bg-bg p-2 text-xs">
              <div className="mb-1 h-10 rounded-xs border border-border" style={{ background: `var(--color-${s})` }} />
              {s}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <p className="text-display font-bold">Display 48</p>
        <p className="text-xl font-bold">Título de página 28</p>
        <p className="text-price font-bold text-price">R$ 1.299,90</p>
        <p className="text-title font-bold">Título do card 18</p>
        <p className="text-base">Texto 16 — corpo das descrições.</p>
        <p className="text-sm text-muted">Texto 14 secundário</p>
        <p className="text-xs text-muted">Texto 12 rótulos</p>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger">Perigo</Button>
          <Button loading>Carregando</Button>
          <Button disabled>Desativado</Button>
          <Button size="sm">Pequeno</Button>
          <Button size="lg">Grande</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GoToDealLink code="demo" />
          <CouponCTA code="demo" couponCode="EXEMPLO15" />
        </div>
      </Section>

      <Section title="Selos e chips">
        <div className="flex flex-wrap items-center gap-3">
          <DiscountChip pct={35} />
          <VerifyBadge verdict="verified" />
          <VerifyBadge verdict="good_price" />
          <VerifyBadge verdict="no_comparison" />
          <TimeChip iso={now} />
        </div>
        <ExpiryBanner iso={inThreeDays} />
        <ExpiryBanner iso={inThreeHours} />
      </Section>

      <Section title="Card de oferta">
        <div className="lg:max-w-(--layout-main)"><DealCard deal={sample} loggedIn={false} /></div>
        <div className="lg:max-w-(--layout-main)"><DealCard deal={{ ...sample, id: "demo2", status: "expired", temperature: -20 }} loggedIn={false} /></div>
        <div className="lg:max-w-(--layout-main)"><DealCard deal={{ ...sample, id: "demo3", priceCents: null, listPriceCents: null, couponCode: "EXEMPLO15", couponPercent: 15, verdict: "pending", realDiscountBp: null }} loggedIn={false} /></div>
        <div className="lg:max-w-(--layout-main)"><DealCardSkeleton /></div>
      </Section>

      <Section title="Formulário">
        <div className="flex max-w-md flex-col gap-4 rounded-card bg-bg p-4 shadow-card">
          <Field label="Campo normal" htmlFor="d1" hint="Texto de ajuda."><Input id="d1" aria-describedby="d1-hint" /></Field>
          <Field label="Campo com erro" htmlFor="d2" error="Mensagem de erro."><Input id="d2" aria-invalid /></Field>
          <Field label="Seleção" htmlFor="d3"><Select id="d3"><option>Opção</option></Select></Field>
          <Field label="Texto longo" htmlFor="d4"><Textarea id="d4" /></Field>
          <FormMessage tone="info">Mensagem informativa.</FormMessage>
          <FormMessage tone="success">Deu certo.</FormMessage>
          <FormMessage>Algo deu errado.</FormMessage>
        </div>
      </Section>

      <Section title="Vazio e anúncio">
        <EmptyState title="Nada por aqui ainda"><p className="text-sm text-muted">Estado vazio com ação.</p></EmptyState>
        <AdSlot minHeight={120} />
      </Section>
    </div>
  );
}

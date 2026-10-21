import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/sidebar";
import { ButtonLink } from "@/components/ui/button";
import { listDiscussions } from "@/lib/data/discussions";
import { DISCUSSION_KINDS, isDiscussionKind, kindLabel } from "@/lib/discussions";
import { timeAgo } from "@/lib/format";
import { stripRichText } from "@/lib/rich-text";

export const metadata = { title: "Discussões", description: "Converse com a comunidade: dicas, dúvidas sobre lojas, pedidos de oferta e mais." };

export default async function DiscussionsPage({ searchParams }: PageProps<"/discussoes">) {
  const sp = await searchParams;
  const kind = isDiscussionKind(sp.tipo) ? sp.tipo : undefined;
  const page = Math.max(1, Number(typeof sp.pagina === "string" ? sp.pagina : 1) || 1);
  const { items, nextOffset } = await listDiscussions({ kind, limit: 20, offset: (page - 1) * 20 });
  const link = (k?: string, p = 1) => {
    const q = new URLSearchParams();
    if (k) q.set("tipo", k);
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `/discussoes?${s}` : "/discussoes";
  };

  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold md:text-display">Discussões</h1>
          <p className="text-muted">Dicas, dúvidas sobre lojas, pedidos de oferta e bate-papo.</p>
        </div>
        <ButtonLink href="/publicar/discussao">Nova discussão</ButtonLink>
      </header>

      <nav aria-label="Tipos de discussão" className="flex gap-1 overflow-x-auto pb-1">
        <Link href={link()} aria-current={!kind ? "page" : undefined} className={`shrink-0 rounded-pill px-4 py-1.5 text-sm ${!kind ? "bg-surface font-bold" : "text-muted hover:bg-surface"}`}>
          Todas
        </Link>
        {DISCUSSION_KINDS.map((k) => (
          <Link key={k.id} href={link(k.id)} aria-current={kind === k.id ? "page" : undefined} className={`shrink-0 rounded-pill px-4 py-1.5 text-sm ${kind === k.id ? "bg-surface font-bold" : "text-muted hover:bg-surface"}`}>
            {k.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState title="Nenhuma discussão por aqui ainda">
          <p className="text-sm text-muted">Puxe o primeiro assunto.</p>
          <ButtonLink href="/publicar/discussao">Nova discussão</ButtonLink>
        </EmptyState>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-card bg-bg shadow-card">
          {items.map((d) => (
            <li key={d.id} className="border-b border-border last:border-b-0">
              <Link href={`/discussoes/${d.slug}`} className="flex gap-3 px-4 py-3 hover:bg-surface">
                <span className="mt-0.5 grid min-w-12 shrink-0 place-items-center rounded-sm bg-surface px-2 py-1 text-sm font-bold" aria-label={`${d.commentsCount} comentários`}>
                  <MessageSquare className="mb-0.5 size-4 text-muted" aria-hidden />
                  {d.commentsCount}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{d.title}</span>
                  {d.body ? <span className="line-clamp-2 text-sm text-muted">{stripRichText(d.body, 200)}</span> : null}
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 font-bold text-accent">{kindLabel(d.kind)}</span>
                    <span>{d.author ? `@${d.author.username}` : "Usuário removido"}</span>
                    <span>ativa {timeAgo(d.lastActivityAt)}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav aria-label="Páginas" className="flex justify-between">
        {page > 1 ? <Link href={link(kind, page - 1)} className="font-bold text-accent">Anteriores</Link> : <span />}
        {nextOffset != null ? <Link href={link(kind, page + 1)} className="font-bold text-accent">Mais discussões</Link> : <span />}
      </nav>
    </div>
  );
}

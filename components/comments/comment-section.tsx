import Link from "next/link";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentItem } from "@/components/comments/comment-item";
import { SubscribeButton } from "@/components/comments/subscribe-button";
import type { CommentView, Role } from "@/lib/types";

type Props = {
  /** Oferta ou discussão onde os comentários aparecem (um dos dois). */
  dealId?: string;
  threadId?: string;
  /** Caminho da página, ex.: /oferta/meu-slug. Usado nos links de ordem e de login. */
  basePath: string;
  comments: CommentView[];
  total: number;
  order: "asc" | "desc";
  loggedIn: boolean;
  viewerId: string | null;
  viewerRole: Role | null;
  subscribed?: boolean;
};

export function CommentSection({ dealId, threadId, basePath, comments, total, order, loggedIn, viewerId, viewerRole, subscribed = false }: Props) {
  const orderLink = (value: "asc" | "desc", label: string) => (
    <Link
      href={value === "asc" ? `${basePath}#comentarios` : `${basePath}?ordem=novos#comentarios`}
      aria-current={order === value ? "true" : undefined}
      className={`rounded-pill px-3 py-1 text-sm ${order === value ? "bg-surface font-bold" : "text-muted hover:bg-surface"}`}
    >
      {label}
    </Link>
  );

  return (
    <section id="comentarios" aria-labelledby="com-title" className="flex scroll-mt-32 flex-col gap-4 rounded-card bg-bg p-4 shadow-card md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="com-title" className="text-title font-bold">{total} {total === 1 ? "comentário" : "comentários"}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Ordem dos comentários" className="flex gap-1">
            {orderLink("asc", "Mais antigos")}
            {orderLink("desc", "Mais novos")}
          </nav>
          {dealId ? <SubscribeButton dealId={dealId} initial={subscribed} loggedIn={loggedIn} /> : null}
        </div>
      </div>

      {loggedIn ? (
        <CommentForm dealId={dealId} threadId={threadId} label="Compartilhe sua opinião, uma dúvida ou uma dica..." />
      ) : (
        <p className="rounded-sm bg-surface px-4 py-3 text-sm">
          <Link href={`/entrar?next=${encodeURIComponent(basePath)}`} className="font-bold text-accent">Entre</Link> ou{" "}
          <Link href={`/cadastrar?next=${encodeURIComponent(basePath)}`} className="font-bold text-accent">crie uma conta</Link> para comentar.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Ninguém comentou ainda. Seja a primeira pessoa.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentItem c={c} topId={c.id} dealId={dealId} threadId={threadId} loggedIn={loggedIn} viewerId={viewerId} viewerRole={viewerRole} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

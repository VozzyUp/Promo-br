import { Flag, Trash2 } from "lucide-react";
import Link from "next/link";
import { removeCommentFormAction } from "@/app/actions/comment";
import { ReactionBar } from "@/components/comments/reaction-bar";
import { ReplyToggle } from "@/components/comments/reply-toggle";
import { ReportDialog } from "@/components/report-dialog";
import { fullDate, timeAgo } from "@/lib/format";
import { RichText } from "@/lib/rich-text";
import type { CommentView, Role } from "@/lib/types";

const REPLIES_SHOWN = 2;
const smallBtn = "inline-flex h-8 items-center gap-1 rounded-pill px-2 text-sm text-muted hover:bg-surface hover:text-text";

type Props = {
  c: CommentView;
  topId: string;
  dealId?: string;
  threadId?: string;
  loggedIn: boolean;
  viewerId: string | null;
  viewerRole: Role | null;
};

export function CommentItem({ c, topId, dealId, threadId, loggedIn, viewerId, viewerRole }: Props) {
  const own = !!viewerId && c.author?.id === viewerId;
  const staff = viewerRole === "admin" || viewerRole === "moderator";
  const isReply = topId !== c.id;
  const isStaffAuthor = c.author && ["admin", "moderator", "system"].includes(c.author.role);
  const shownReplies = c.replies.slice(0, REPLIES_SHOWN);
  const moreReplies = c.replies.slice(REPLIES_SHOWN);

  return (
    <article id={`c-${c.id}`} className="flex scroll-mt-32 gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-pill bg-surface text-sm font-bold" aria-hidden>
        {c.author ? c.author.displayName.slice(0, 1).toUpperCase() : "?"}
      </span>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-x-2 text-sm">
          {c.author ? (
            <Link href={`/u/${c.author.username}`} className="font-bold hover:text-accent">{c.author.username}</Link>
          ) : (
            <span className="font-bold text-muted">Usuário removido</span>
          )}
          {isStaffAuthor ? <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent">Equipe</span> : null}
          <time dateTime={c.createdAt} title={fullDate(c.createdAt)} className="text-muted">{timeAgo(c.createdAt)}</time>
        </header>

        {c.removed ? (
          <p className="mt-1 text-sm italic text-muted">Comentário removido.</p>
        ) : (
          <>
            <RichText text={c.body} className="mt-1 text-base" />
            <div className="mt-1 flex flex-wrap items-center gap-x-1">
              <ReactionBar
                commentId={c.id}
                initial={{ likes: c.likes, helpful: c.helpful, haha: c.haha, mine: c.mine }}
                loggedIn={loggedIn}
                own={own}
              />
              <ReplyToggle dealId={dealId} threadId={threadId} parentId={topId} mention={isReply ? (c.author?.username ?? null) : null} loggedIn={loggedIn} />
              {!own ? (
                <ReportDialog
                  target="comment"
                  id={c.id}
                  kinds={[
                    { value: "spam", label: "Spam ou propaganda" },
                    { value: "offensive", label: "Ofensivo ou desrespeitoso" },
                    { value: "fake", label: "Informação falsa" },
                  ]}
                  title="Denunciar comentário"
                  description="Com 3 denúncias o comentário fica escondido até a equipe revisar."
                  loggedIn={loggedIn}
                  triggerClassName={smallBtn}
                >
                  <Flag className="size-4" aria-hidden /> Denunciar
                </ReportDialog>
              ) : null}
              {own || staff ? (
                <form action={removeCommentFormAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={smallBtn}>
                    <Trash2 className="size-4" aria-hidden /> Remover
                  </button>
                </form>
              ) : null}
            </div>
          </>
        )}

        {!isReply && c.replies.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-3">
            {shownReplies.map((r) => (
              <CommentItem key={r.id} c={r} topId={c.id} dealId={dealId} threadId={threadId} loggedIn={loggedIn} viewerId={viewerId} viewerRole={viewerRole} />
            ))}
            {moreReplies.length > 0 ? (
              <details>
                <summary className="cursor-pointer text-sm font-bold text-accent">Ver mais respostas ({moreReplies.length})</summary>
                <div className="mt-3 flex flex-col gap-3">
                  {moreReplies.map((r) => (
                    <CommentItem key={r.id} c={r} topId={c.id} dealId={dealId} threadId={threadId} loggedIn={loggedIn} viewerId={viewerId} viewerRole={viewerRole} />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

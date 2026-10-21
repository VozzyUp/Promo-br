import { Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removeDiscussionFormAction } from "@/app/actions/discussion";
import { CommentSection } from "@/components/comments/comment-section";
import { getSession } from "@/lib/auth";
import { listComments } from "@/lib/data/comments";
import { getDiscussionBySlug } from "@/lib/data/discussions";
import { kindLabel } from "@/lib/discussions";
import { fullDate, timeAgo } from "@/lib/format";
import { RichText } from "@/lib/rich-text";

export async function generateMetadata({ params }: PageProps<"/discussoes/[slug]">) {
  const { slug } = await params;
  const d = await getDiscussionBySlug(slug);
  return { title: d?.title ?? "Discussão não encontrada" };
}

export default async function DiscussionPage({ params, searchParams }: PageProps<"/discussoes/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const d = await getDiscussionBySlug(slug);
  if (!d) notFound();
  const session = await getSession();
  const thread = await listComments({ threadId: d.id }, session?.userId ?? null, sp.ordem === "novos" ? "desc" : "asc");
  const canRemove = !!session && (session.userId === d.authorId || session.role === "admin" || session.role === "moderator");

  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-4">
      <nav aria-label="Trilha" className="text-sm text-muted">
        <Link href="/discussoes" className="hover:text-text">Discussões</Link>
      </nav>

      <article aria-labelledby="disc-title" className="flex flex-col gap-3 rounded-card bg-bg p-4 shadow-card md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent">{kindLabel(d.kind)}</span>
          {d.category ? <span className="text-muted">{d.category.name}</span> : null}
        </div>
        <h1 id="disc-title" className="text-xl font-bold">{d.title}</h1>
        <p className="text-sm text-muted">
          {d.author ? <Link href={`/u/${d.author.username}`} className="font-bold text-text hover:text-accent">@{d.author.username}</Link> : "Usuário removido"}
          {" · "}
          <time dateTime={d.createdAt} title={fullDate(d.createdAt)}>{timeAgo(d.createdAt)}</time>
        </p>
        {d.body ? <RichText text={d.body} className="text-base" /> : null}
        {canRemove ? (
          <form action={removeDiscussionFormAction}>
            <input type="hidden" name="id" value={d.id} />
            <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border px-3 text-sm font-bold text-danger hover:bg-surface">
              <Trash2 className="size-4" aria-hidden /> Remover discussão
            </button>
          </form>
        ) : null}
      </article>

      <CommentSection
        threadId={d.id}
        basePath={`/discussoes/${d.slug}`}
        comments={thread.comments}
        total={thread.total}
        order={sp.ordem === "novos" ? "desc" : "asc"}
        loggedIn={!!session}
        viewerId={session?.userId ?? null}
        viewerRole={session?.role ?? null}
      />
    </div>
  );
}

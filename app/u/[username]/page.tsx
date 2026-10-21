import Link from "next/link";
import { notFound } from "next/navigation";
import { DealCard } from "@/components/deal-card";
import { EmptyState } from "@/components/sidebar";
import { getSession } from "@/lib/auth";
import { getPublicProfile, listUserComments } from "@/lib/data/profiles";
import { listDealsByAuthor } from "@/lib/data/deals-extra";
import { fullDate, timeAgo } from "@/lib/format";
import { stripRichText } from "@/lib/rich-text";

export async function generateMetadata({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  return { title: profile ? `@${profile.username}` : "Perfil não encontrado" };
}

const TABS = [
  { id: "ofertas", label: "Ofertas" },
  { id: "comentarios", label: "Comentários" },
] as const;

export default async function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const sp = await searchParams;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  const session = await getSession();
  const tab = TABS.find((t) => t.id === sp.aba)?.id ?? "ofertas";
  const mine = session?.userId === profile.id;

  const [deals, comments] = await Promise.all([
    tab === "ofertas" ? listDealsByAuthor(profile.id, session?.userId ?? null, 20) : Promise.resolve([]),
    tab === "comentarios" ? listUserComments(profile.id, 20) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center gap-4 rounded-card bg-bg p-4 shadow-card md:p-6">
        <span className="grid size-16 shrink-0 place-items-center rounded-pill bg-surface text-2xl font-bold" aria-hidden>
          {profile.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-muted">
            @{profile.username} · membro desde <time dateTime={profile.createdAt}>{fullDate(profile.createdAt)}</time>
          </p>
          <p className="mt-1 text-sm">
            <strong>{profile.dealsCount}</strong> {profile.dealsCount === 1 ? "oferta" : "ofertas"} ·{" "}
            <strong>{profile.commentsCount}</strong> {profile.commentsCount === 1 ? "comentário" : "comentários"}
            {profile.trusted ? " · perfil de confiança" : ""}
          </p>
        </div>
        {mine ? (
          <Link href="/conta/ajustes" className="rounded-pill border border-border px-4 py-2 text-sm font-bold hover:bg-surface">
            Editar conta
          </Link>
        ) : null}
      </header>

      <nav aria-label="Seções do perfil" className="flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/u/${profile.username}?aba=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`rounded-pill px-4 py-1.5 text-sm ${t.id === tab ? "bg-surface font-bold" : "text-muted hover:bg-surface"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "ofertas" ? (
        deals.length === 0 ? (
          <EmptyState title="Nenhuma oferta publicada ainda" />
        ) : (
          <div className="flex flex-col gap-4">
            {deals.map((d) => (
              <DealCard key={d.id} deal={d} loggedIn={!!session} />
            ))}
          </div>
        )
      ) : comments.length === 0 ? (
        <EmptyState title="Nenhum comentário ainda" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-card bg-bg shadow-card">
          {comments.map((c) => (
            <li key={c.id} className="p-4">
              <Link href={`/oferta/${c.dealSlug}#c-${c.id}`} className="font-bold hover:text-accent">{c.dealTitle}</Link>
              <p className="mt-1 text-sm">{stripRichText(c.body, 220)}</p>
              <time dateTime={c.createdAt} className="text-xs text-muted">{timeAgo(c.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

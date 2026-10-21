import Link from "next/link";
import { notFound } from "next/navigation";
import { DealCard } from "@/components/deal-card";
import { FollowButtons } from "@/components/follow-buttons";
import { EmptyState } from "@/components/sidebar";
import { getSession } from "@/lib/auth";
import { badgeName } from "@/lib/badges";
import { getPoints, listUserBadgeKeys } from "@/lib/data/gamification";
import { getRelation, savedSet } from "@/lib/data/relations";
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

  const [deals, comments, points, badgeKeys, relation] = await Promise.all([
    tab === "ofertas" ? listDealsByAuthor(profile.id, session?.userId ?? null, 20) : Promise.resolve([]),
    tab === "comentarios" ? listUserComments(profile.id, 20) : Promise.resolve([]),
    getPoints(profile.id),
    listUserBadgeKeys(profile.id),
    session && !mine ? getRelation(session.userId, profile.id) : Promise.resolve(null),
  ]);
  const saved = session ? await savedSet(session.userId, deals.map((d) => d.id)) : new Set<string>();
  const level = points.level.current;
  const badges = badgeKeys.map((k) => badgeName(k)).filter((n): n is string => !!n).slice(0, 4);

  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center gap-4 rounded-card bg-bg p-4 shadow-card md:p-6">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar vem do Storage do Supabase
          <img src={profile.avatarUrl} alt={`Foto de ${profile.displayName}`} className="size-16 shrink-0 rounded-pill object-cover" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-pill bg-surface text-2xl font-bold" aria-hidden>
            {profile.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
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
          {profile.bio ? <p className="mt-1 whitespace-pre-line break-words text-sm">{profile.bio}</p> : null}
          {level || badges.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Nível e medalhas">
              {level ? <li className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">Nível {level.name}</li> : null}
              {badges.map((b) => (
                <li key={b} className="rounded-pill bg-surface px-2.5 py-0.5 text-xs font-bold">{b}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {mine ? (
          <Link href="/conta/ajustes" className="rounded-pill border border-border px-4 py-2 text-sm font-bold hover:bg-surface">
            Editar conta
          </Link>
        ) : (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <FollowButtons targetId={profile.id} initial={relation} loggedIn={!!session} />
            <Link href={`/conta/mensagens/${profile.username}`} className="text-sm font-bold text-accent">Enviar mensagem</Link>
          </div>
        )}
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
              <DealCard key={d.id} deal={d} loggedIn={!!session} saved={saved.has(d.id)} />
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

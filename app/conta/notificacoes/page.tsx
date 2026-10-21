import Link from "next/link";
import { markAllReadFormAction } from "@/app/actions/notifications";
import { EmptyState } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/data/social";
import { fullDate, timeAgo } from "@/lib/format";
import { describeNotification, type NotificationFilter } from "@/lib/notifications";

export const metadata = { title: "Notificações" };

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "ofertas", label: "Ofertas" },
  { id: "comentarios", label: "Comentários" },
  { id: "pontos", label: "Pontos" },
];

export default async function NotificationsPage({ searchParams }: PageProps<"/conta/notificacoes">) {
  const session = await requireUser("/conta/notificacoes");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.id === sp.filtro)?.id ?? "todas";
  const items = await listNotifications(session.userId, { limit: 60, filter });
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Notificações</h1>
        <form action={markAllReadFormAction}>
          <button type="submit" disabled={!hasUnread} className="rounded-pill border border-border px-4 py-2 text-sm font-bold hover:bg-surface disabled:opacity-50">
            Marcar todas como lidas
          </button>
        </form>
      </div>

      <nav aria-label="Filtrar notificações" className="flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "todas" ? "/conta/notificacoes" : `/conta/notificacoes?filtro=${f.id}`}
            aria-current={f.id === filter ? "page" : undefined}
            className={`shrink-0 rounded-pill px-4 py-1.5 text-sm ${f.id === filter ? "bg-surface font-bold" : "text-muted hover:bg-surface"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState title="Por enquanto você não tem notificações">
          <p className="text-sm text-muted">Quando alguém comentar, responder ou mencionar você, o aviso aparece aqui.</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-card bg-bg shadow-card">
          {items.map((n) => {
            const { text, href } = describeNotification(n);
            return (
              <li key={n.id} className="border-b border-border last:border-b-0">
                <Link href={href} className="flex gap-3 px-4 py-3 hover:bg-surface">
                  <span className={`mt-2 size-2 shrink-0 rounded-pill ${n.readAt ? "bg-transparent" : "bg-accent"}`} aria-hidden />
                  <span className="min-w-0">
                    <span className={`block ${n.readAt ? "text-muted" : "font-bold"}`}>{text}</span>
                    <time dateTime={n.createdAt} title={fullDate(n.createdAt)} className="text-xs text-muted">{timeAgo(n.createdAt)}</time>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

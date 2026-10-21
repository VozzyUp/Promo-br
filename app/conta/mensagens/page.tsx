import Link from "next/link";
import { EmptyState } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/data/messages";
import { timeAgo } from "@/lib/format";
import { stripRichText } from "@/lib/rich-text";

export const metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  const session = await requireUser("/conta/mensagens");
  const conversations = await listConversations(session.userId);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Mensagens</h1>
      {conversations.length === 0 ? (
        <EmptyState title="Nenhuma conversa ainda">
          <p className="text-sm text-muted">Para começar, abra o perfil de alguém e use &ldquo;Enviar mensagem&rdquo;.</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-card bg-bg shadow-card">
          {conversations.map((c) => (
            <li key={c.other.id} className="border-b border-border last:border-b-0">
              <Link href={`/conta/mensagens/${c.other.username}`} className="flex gap-3 px-4 py-3 hover:bg-surface">
                <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-surface font-bold" aria-hidden>
                  {c.other.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={c.unread ? "font-bold" : ""}>@{c.other.username}</span>
                    <time dateTime={c.lastAt} className="text-xs text-muted">{timeAgo(c.lastAt)}</time>
                  </span>
                  <span className={`block truncate text-sm ${c.unread ? "font-bold" : "text-muted"}`}>
                    {c.lastMine ? "Você: " : ""}{stripRichText(c.lastBody, 90)}
                  </span>
                </span>
                {c.unread > 0 ? <span className="self-center rounded-pill bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">{c.unread}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

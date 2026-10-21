import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageForm } from "@/components/forms/message-form";
import { requireUser } from "@/lib/auth";
import { getPersonByUsername, getThread } from "@/lib/data/messages";
import { fullDate, timeAgo } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/conta/mensagens/[username]">) {
  const { username } = await params;
  return { title: `Conversa com @${username}` };
}

export default async function ThreadPage({ params }: PageProps<"/conta/mensagens/[username]">) {
  const { username } = await params;
  const session = await requireUser(`/conta/mensagens/${username}`);
  const other = await getPersonByUsername(username);
  if (!other || other.id === session.userId) notFound();
  const messages = await getThread(session.userId, other.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          Conversa com <Link href={`/u/${other.username}`} className="hover:text-accent">@{other.username}</Link>
        </h1>
        <Link href="/conta/mensagens" className="text-sm font-bold text-accent">Todas as conversas</Link>
      </div>

      <section aria-label="Mensagens" className="flex flex-col gap-2 rounded-card bg-bg p-4 shadow-card">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Ainda não há mensagens. Escreva a primeira.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-card px-3 py-2 ${m.mine ? "bg-accent-soft" : "bg-surface"}`}>
                <p className="whitespace-pre-line break-words text-base">{m.body}</p>
                <time dateTime={m.createdAt} title={fullDate(m.createdAt)} className="text-xs text-muted">{timeAgo(m.createdAt)}</time>
              </div>
            </div>
          ))
        )}
      </section>

      <MessageForm to={other.username} label={`Mensagem para @${other.username}`} />
    </div>
  );
}

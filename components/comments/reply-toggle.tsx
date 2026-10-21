"use client";

import { MessageSquareReply } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CommentForm } from "@/components/comments/comment-form";

/** Botão "Responder" que abre o formulário logo abaixo do comentário. */
export function ReplyToggle({
  dealId, threadId, parentId, mention, loggedIn,
}: { dealId?: string; threadId?: string; parentId: string; mention: string | null; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (!loggedIn) {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(pathname)}`} className="inline-flex h-8 items-center gap-1 rounded-pill px-2 text-sm text-muted hover:bg-surface">
        <MessageSquareReply className="size-4" aria-hidden /> Responder
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1 rounded-pill px-2 text-sm text-muted hover:bg-surface"
      >
        <MessageSquareReply className="size-4" aria-hidden /> Responder
      </button>
      {open ? (
        <div className="order-last mt-2 w-full basis-full">
          <CommentForm
            dealId={dealId}
            threadId={threadId}
            parentId={parentId}
            initialText={mention ? `@${mention} ` : ""}
            autoFocus
            label="Escreva sua resposta"
            onDone={() => setOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}

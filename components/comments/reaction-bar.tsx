"use client";

import { Laugh, Lightbulb, ThumbsUp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reactAction } from "@/app/actions/comment";
import type { CommentReaction } from "@/lib/types";

type Counts = { likes: number; helpful: number; haha: number; mine: CommentReaction | null };

const items = [
  { kind: "like", label: "Curtir", Icon: ThumbsUp, field: "likes" },
  { kind: "helpful", label: "Útil", Icon: Lightbulb, field: "helpful" },
  { kind: "haha", label: "Haha", Icon: Laugh, field: "haha" },
] as const;

function applyReaction(c: Counts, kind: CommentReaction): Counts {
  const next = { ...c };
  const field = (k: CommentReaction) => items.find((i) => i.kind === k)!.field;
  if (c.mine === kind) {
    next[field(kind)] -= 1;
    next.mine = null;
  } else {
    if (c.mine) next[field(c.mine)] -= 1;
    next[field(kind)] += 1;
    next.mine = kind;
  }
  return next;
}

export function ReactionBar({ commentId, initial, loggedIn, own }: { commentId: string; initial: Counts; loggedIn: boolean; own: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(kind: CommentReaction) {
    if (!loggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (own) return;
    const before = counts;
    setError(null);
    setCounts(applyReaction(before, kind));
    start(async () => {
      const result = await reactAction(commentId, kind);
      if ("error" in result) {
        setCounts(before);
        setError(result.error);
      } else {
        setCounts(result);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1" aria-busy={pending || undefined}>
      {items.map(({ kind, label, Icon, field }) => {
        const n = counts[field];
        const active = counts.mine === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            aria-pressed={active}
            disabled={own}
            title={own ? "Você não pode reagir ao próprio comentário" : label}
            className={`inline-flex h-8 items-center gap-1 rounded-pill px-2 text-sm hover:bg-surface disabled:cursor-default disabled:hover:bg-transparent ${active ? "bg-accent-soft font-bold text-accent" : "text-muted"}`}
          >
            <Icon className="size-4" aria-hidden />
            <span>{label}</span>
            {n > 0 ? <span className="font-bold">{n}</span> : null}
          </button>
        );
      })}
      {error ? <span className="text-xs text-danger" role="alert">{error}</span> : null}
    </div>
  );
}

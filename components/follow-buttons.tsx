"use client";

import { Ban, UserCheck, UserPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setRelationAction } from "@/app/actions/social";
import type { Relation } from "@/lib/data/relations";

const base = "inline-flex h-9 items-center gap-1.5 rounded-pill border px-3 text-sm font-bold";

export function FollowButtons({ targetId, initial, loggedIn }: { targetId: string; initial: Relation; loggedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [relation, setRelation] = useState<Relation>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function change(kind: "follow" | "ignore") {
    if (!loggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const before = relation;
    const next: Relation = relation === kind ? null : kind;
    setError(null);
    setRelation(next);
    start(async () => {
      const r = await setRelationAction(targetId, next);
      if ("error" in r) {
        setRelation(before);
        setError(r.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending || undefined}>
      <button
        type="button"
        onClick={() => change("follow")}
        aria-pressed={relation === "follow"}
        className={`${base} ${relation === "follow" ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface"}`}
      >
        {relation === "follow" ? <UserCheck className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        {relation === "follow" ? "Seguindo" : "Seguir"}
      </button>
      <button
        type="button"
        onClick={() => change("ignore")}
        aria-pressed={relation === "ignore"}
        title="Suas ofertas deixam de mostrar o que essa pessoa publica"
        className={`${base} ${relation === "ignore" ? "border-danger text-danger" : "border-border text-muted hover:bg-surface"}`}
      >
        <Ban className="size-4" aria-hidden />
        {relation === "ignore" ? "Ignorando" : "Ignorar"}
      </button>
      {error ? <span className="text-sm text-danger" role="alert">{error}</span> : null}
    </div>
  );
}

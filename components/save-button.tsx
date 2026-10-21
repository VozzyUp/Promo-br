"use client";

import { Bookmark } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleSaveAction } from "@/app/actions/social";

export function SaveButton({ dealId, saved: initial, loggedIn }: { dealId: string; saved: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    if (!loggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const before = saved;
    setSaved(!before);
    start(async () => {
      const r = await toggleSaveAction(dealId);
      if ("error" in r) setSaved(before);
      else setSaved(r.saved);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remover dos salvos" : "Salvar oferta"}
      title={saved ? "Remover dos salvos" : "Salvar oferta"}
      disabled={pending}
      className={`grid size-9 place-items-center rounded-sm hover:bg-surface ${saved ? "text-accent" : "text-muted"}`}
    >
      <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}

"use client";

import { Bell, BellOff } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { subscribeAction } from "@/app/actions/comment";

/** Quem segue a oferta recebe aviso de novos comentários. */
export function SubscribeButton({ dealId, initial, loggedIn }: { dealId: string; initial: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    if (!loggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !on;
    setOn(next);
    start(async () => {
      const r = await subscribeAction(dealId, next);
      if (!r.ok) setOn(!next);
    });
  }

  const Icon = on ? BellOff : Bell;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border px-3 text-sm font-bold hover:bg-surface"
    >
      <Icon className="size-4" aria-hidden />
      {on ? "Seguindo comentários" : "Seguir comentários"}
    </button>
  );
}

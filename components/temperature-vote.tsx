"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { voteAction } from "@/app/actions/vote";

type State = { temperature: number; myVote: -1 | 0 | 1 };

export function TemperatureVote({ dealId, initial, loggedIn }: { dealId: string; initial: State; loggedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [state, setOptimistic] = useOptimistic(initial, (cur: State, value: -1 | 1): State => {
    const undo = cur.myVote === value;
    const delta = (undo ? -value : value - cur.myVote) * 10;
    return { temperature: cur.temperature + delta, myVote: undo ? 0 : value };
  });

  function cast(value: -1 | 1) {
    if (!loggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    start(async () => {
      setOptimistic(value);
      await voteAction(dealId, value);
    });
  }

  const color = state.temperature >= 100 ? "text-hot" : state.temperature <= 0 ? "text-cold" : "text-text";
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-pill border border-border px-1" aria-busy={pending || undefined}>
      <button
        type="button"
        onClick={() => cast(-1)}
        aria-pressed={state.myVote === -1}
        aria-label="Votar frio"
        className="grid size-7 place-items-center rounded-pill text-cold hover:bg-info-soft"
      >
        <ArrowBigDown className="size-5" fill={state.myVote === -1 ? "currentColor" : "none"} aria-hidden />
      </button>
      <span className={`min-w-10 text-center text-base font-bold ${color}`} aria-live="polite">{state.temperature}°</span>
      <button
        type="button"
        onClick={() => cast(1)}
        aria-pressed={state.myVote === 1}
        aria-label="Votar quente"
        className="grid size-7 place-items-center rounded-pill text-hot hover:bg-accent-soft"
      >
        <ArrowBigUp className="size-5" fill={state.myVote === 1 ? "currentColor" : "none"} aria-hidden />
      </button>
    </div>
  );
}

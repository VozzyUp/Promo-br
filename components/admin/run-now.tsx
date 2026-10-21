"use client";
import { useActionState } from "react";
import { runNowAction, type RunNowState } from "@/app/actions/jobs";

export function RunNow({ job, label }: { job: string; label: string }) {
  const [state, action, pending] = useActionState<RunNowState, FormData>(runNowAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="job" value={job} />
      <button type="submit" disabled={pending} className="h-9 rounded-pill border border-accent px-4 text-sm font-bold text-accent disabled:opacity-50">
        {pending ? "Rodando…" : label}
      </button>
      <p role="status" className="text-xs text-muted">{state?.message ?? ""}</p>
    </form>
  );
}
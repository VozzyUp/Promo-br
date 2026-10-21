import { googleLoginAction } from "@/app/actions/auth";

/** "Continuar com Google" + divisória. Só é montado quando o login com Google está ligado. */
export function GoogleButton({ next }: { next: string }) {
  return (
    <div className="mb-5 flex flex-col gap-4">
      <form action={googleLoginAction}>
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="flex h-11 w-full items-center justify-center gap-3 rounded-pill border border-border-input bg-bg text-sm font-bold hover:bg-surface">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden focusable="false">
            <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5Z" />
            <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5Z" />
            <path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3Z" />
            <path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.4 9 5.4 12 5.4Z" />
          </svg>
          Continuar com Google
        </button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
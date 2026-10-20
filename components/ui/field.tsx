import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-sm border border-border-input bg-bg px-3 text-base text-text placeholder:text-muted " +
  "aria-[invalid=true]:border-danger";

export function Field({
  label, htmlFor, hint, error, children,
}: { label: string; htmlFor: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-bold">{label}</label>
      {children}
      {hint ? <p id={hintId} className="text-sm text-muted">{hint}</p> : null}
      {error ? <p id={errorId} className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={`${control} h-11 ${className}`} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea {...rest} className={`${control} min-h-28 py-2 ${className}`} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return <select {...rest} className={`${control} h-11 ${className}`} />;
}

export function FormMessage({ tone = "danger", children }: { tone?: "danger" | "success" | "info"; children: ReactNode }) {
  const tones = { danger: "bg-bg border-danger text-danger", success: "bg-price-soft border-success text-success", info: "bg-info-soft border-info text-info" };
  return <div role="status" className={`rounded-sm border px-3 py-2 text-sm ${tones[tone]}`}>{children}</div>;
}

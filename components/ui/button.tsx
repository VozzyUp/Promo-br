import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-accent text-accent bg-bg hover:bg-accent-soft",
  ghost: "text-muted hover:bg-surface hover:text-text",
  danger: "bg-danger text-on-accent hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses({ variant = "primary", size = "md", full = false }: { variant?: Variant; size?: Size; full?: boolean } = {}) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-pill font-bold transition-colors duration-(--motion-fast)",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    full ? "w-full" : "",
  ].join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; full?: boolean; loading?: boolean };

export function Button({ variant, size, full, loading, className = "", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses({ variant, size, full })} ${className}`}
    >
      {loading ? <span className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; full?: boolean };

export function ButtonLink({ variant, size, full, className = "", ...rest }: ButtonLinkProps) {
  return <Link {...rest} className={`${buttonClasses({ variant, size, full })} ${className}`} />;
}

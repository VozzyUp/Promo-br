/** PromoValeu: sacola de compras com porcentagem. Mesmo desenho do app/icon.svg. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <rect width="64" height="64" rx="16" className="fill-accent" />
      <path d="M24 25v-6a8 8 0 0 1 16 0v6" fill="none" strokeWidth="4.5" strokeLinecap="round" className="stroke-on-accent" />
      <path d="M19 23h26a3 3 0 0 1 3 2.7l2.7 24a3 3 0 0 1-3 3.3H16.3a3 3 0 0 1-3-3.3l2.7-24a3 3 0 0 1 3-2.7Z" className="fill-on-accent" />
      <circle cx="26" cy="33" r="3" fill="none" strokeWidth="3" className="stroke-accent" />
      <circle cx="38" cy="44" r="3" fill="none" strokeWidth="3" className="stroke-accent" />
      <path d="m25 45 14-14" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-accent" />
    </svg>
  );
}

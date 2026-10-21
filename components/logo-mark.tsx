/** Símbolo da marca: uma etiqueta de preço com um visto, em violeta. Mesmo desenho do app/icon.svg. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path d="M9 8.5h7.2c.5 0 1 .2 1.4.6l6.3 6.3c.8.8.8 2 0 2.8l-5.2 5.2c-.8.8-2 .8-2.8 0L8.6 17c-.4-.4-.6-.9-.6-1.4V9.5c0-.6.4-1 1-1Z" className="fill-on-accent" />
      <circle cx="12.2" cy="12.2" r="1.5" className="fill-accent" />
      <path d="m15 17.4 1.8 1.8 3.4-3.6" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="stroke-accent" />
    </svg>
  );
}

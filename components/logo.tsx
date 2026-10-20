import Link from "next/link";

/** Logo provisório (texto + etiqueta). Substituir no /replica-brand. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 text-xl font-bold text-text" aria-label="promo-br, página inicial">
      <span className="grid size-7 place-items-center rounded-sm bg-accent text-sm text-on-accent" aria-hidden>%</span>
      <span>promo<span className="text-accent">-br</span></span>
    </Link>
  );
}

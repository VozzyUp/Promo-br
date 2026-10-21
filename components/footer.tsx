import Link from "next/link";
import { ConsentReset } from "@/components/consent/consent-banner";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-bg">
      <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:justify-between">
        <p className="max-w-md">
          Alguns links nos pagam comissão quando você compra. Isso não muda a ordem nem o que aparece aqui:
          quem decide é a comunidade e o desconto real.
        </p>
        <nav aria-label="Institucional" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/sobre" className="hover:text-text">Sobre</Link>
          <Link href="/como-ganhamos-dinheiro" className="hover:text-text">Como ganhamos dinheiro</Link>
          <Link href="/privacidade" className="hover:text-text">Privacidade</Link>
          <Link href="/termos" className="hover:text-text">Termos</Link>
          <Link href="/conduta" className="hover:text-text">Conduta</Link>
          <ConsentReset />
        </nav>
      </div>
    </footer>
  );
}

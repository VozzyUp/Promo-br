import Link from "next/link";
import { ConsentReset } from "@/components/consent/consent-banner";
import { NewsletterForm } from "@/components/newsletter-form";

export function Footer({ notice, newsletter = false }: { notice: string; newsletter?: boolean }) {
  return (
    <footer className="mt-12 border-t border-border bg-bg pb-16 md:pb-0">
      {newsletter ? <div className="mx-auto max-w-(--layout-max) border-b border-border px-4 py-6 text-sm text-muted"><NewsletterForm /></div> : null}
      <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:justify-between">
        <p className="max-w-md">
          {notice}
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

import { MessageSquare, Tag, Ticket } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Publicar" };

const OPTIONS = [
  { href: "/publicar/oferta", title: "Oferta", text: "Um produto com preço baixo, online ou em loja física.", Icon: Tag },
  { href: "/publicar/cupom", title: "Cupom", text: "Um código de desconto ou frete grátis.", Icon: Ticket },
  { href: "/publicar/discussao", title: "Discussão", text: "Uma dúvida, dica ou assunto para a comunidade.", Icon: MessageSquare },
] as const;

export default async function PublishChooserPage() {
  await requireUser("/publicar");
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-bold">O que você quer publicar?</h1>
      <p className="mb-6 text-sm text-muted">Escolha o tipo e siga o passo a passo.</p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ href, title, text, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex h-full flex-col gap-2 rounded-card bg-bg p-5 shadow-card hover:shadow-card-hover focus-visible:outline-2">
              <Icon className="size-6 text-accent" aria-hidden />
              <span className="font-bold">{title}</span>
              <span className="text-sm text-muted">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

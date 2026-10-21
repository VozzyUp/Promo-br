"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Bell, BellPlus, Gift, LogIn, LogOut, MessagesSquare, ShieldCheck, Tag, Ticket, User, X } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { useState, type ReactNode } from "react";

export type MenuCategory = { name: string; slug: string };

const SECTIONS = [
  { href: "/cupons", label: "Cupons", Icon: Ticket },
  { href: "/gratis", label: "Grátis", Icon: Gift },
  { href: "/?aba=novas", label: "Ofertas novas", Icon: Tag },
  { href: "/discussoes", label: "Discussões", Icon: MessagesSquare },
  { href: "/alertas", label: "Criar alerta", Icon: BellPlus },
];

const INSTITUTIONAL = [
  { href: "/sobre", label: "Sobre" },
  { href: "/como-ganhamos-dinheiro", label: "Como ganhamos dinheiro" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos" },
  { href: "/conduta", label: "Conduta" },
];

/** Gaveta de navegação: o botão que a abre vem de fora (cabeçalho ou barra inferior). */
export function MenuDrawer({
  categories, loggedIn, isStaff = false, unread = 0, className, label = "Abrir menu", children,
}: { categories: MenuCategory[]; loggedIn: boolean; isStaff?: boolean; unread?: number; className?: string; label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const row = "flex min-h-11 items-center gap-3 rounded-sm px-2 text-base hover:bg-surface";
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={className} aria-label={label}>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col gap-4 overflow-y-auto bg-bg p-4 shadow-card" aria-describedby={undefined}>
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-title font-bold">Menu</Dialog.Title>
            <Dialog.Close className="grid size-10 place-items-center rounded-pill hover:bg-surface" aria-label="Fechar menu"><X className="size-5" aria-hidden /></Dialog.Close>
          </div>
          <nav aria-label="Menu principal" className="flex flex-col gap-1">
            <Link href="/black-friday" onClick={close} className={`${row} font-bold text-accent`}>Black Friday</Link>
            {SECTIONS.map(({ href, label: l, Icon }) => (
              <Link key={href} href={href} onClick={close} className={row}><Icon className="size-5 text-muted" aria-hidden /> {l}</Link>
            ))}
            {loggedIn ? (
              <>
                <Link href="/conta/notificacoes" onClick={close} className={row}><Bell className="size-5 text-muted" aria-hidden /> Notificações{unread > 0 ? ` (${unread})` : ""}</Link>
                <Link href="/conta" onClick={close} className={row}><User className="size-5 text-muted" aria-hidden /> Minha conta</Link>
                {isStaff ? <Link href="/painel" onClick={close} className={row}><ShieldCheck className="size-5 text-muted" aria-hidden /> Painel da equipe</Link> : null}
                <form action={logoutAction}>
                  <button type="submit" className={`${row} w-full text-left text-danger`}><LogOut className="size-5" aria-hidden /> Sair</button>
                </form>
              </>
            ) : (
              <Link href="/entrar" onClick={close} className={row}><LogIn className="size-5 text-muted" aria-hidden /> Entrar ou cadastrar</Link>
            )}
          </nav>
          {categories.length > 0 ? (
            <nav aria-label="Categorias" className="flex flex-col gap-1 border-t border-border pt-3">
              <p className="px-2 text-sm font-bold text-muted">Categorias</p>
              {categories.map((c) => <Link key={c.slug} href={`/c/${c.slug}`} onClick={close} className={row}>{c.name}</Link>)}
            </nav>
          ) : null}
          <nav aria-label="Institucional" className="mt-auto flex flex-col gap-1 border-t border-border pt-3 text-sm text-muted">
            {INSTITUTIONAL.map((l) => <Link key={l.href} href={l.href} onClick={close} className="flex min-h-9 items-center px-2 hover:text-text">{l.label}</Link>)}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
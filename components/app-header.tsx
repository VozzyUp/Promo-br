import Link from "next/link";
import { BellPlus, Gift, LayoutGrid, Menu, MessagesSquare, Plus, Search, Tag, Ticket, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import type { Session } from "@/lib/types";

const nav = [
  { href: "/c/eletronicos", label: "Categorias", icon: LayoutGrid },
  { href: "/cupons", label: "Cupons", icon: Ticket },
  { href: "/gratis", label: "Grátis", icon: Gift },
  { href: "/?aba=novas", label: "Ofertas", icon: Tag },
  { href: "/discussoes", label: "Discussões", icon: MessagesSquare },
];

export function AppHeader({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <div className="mx-auto flex h-14 max-w-(--layout-max) items-center gap-3 px-4">
        <Logo />
        <button type="button" className="hidden items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-sm md:flex" aria-label="Abrir menu">
          <Menu className="size-4" aria-hidden /> Menu
        </button>
        <form action="/busca" role="search" className="relative hidden flex-1 sm:block md:max-w-56">
          <label htmlFor="q" className="sr-only">Buscar ofertas</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="q" name="q" type="search" placeholder="Buscar ofertas" className="h-9 w-full rounded-pill border border-border bg-bg pl-9 pr-3 text-sm" />
        </form>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Link href="/alertas" className="hidden items-center gap-1.5 text-sm font-bold lg:flex">
            <BellPlus className="size-4" aria-hidden /> Criar alerta
          </Link>
          {session ? (
            <div className="flex items-center gap-2">
              {session.role === "admin" || session.role === "moderator" ? (
                <Link href="/painel" className="hidden text-sm font-bold sm:inline">Painel</Link>
              ) : null}
              <Link href={`/u/${session.username}`} className="flex items-center gap-1.5 text-sm font-bold">
                <User className="size-4" aria-hidden /> <span className="hidden sm:inline">@{session.username}</span>
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="text-sm text-muted hover:text-text">Sair</button>
              </form>
            </div>
          ) : (
            <Link href="/entrar" className="flex items-center gap-1.5 text-sm font-bold">
              <User className="size-4" aria-hidden /> <span className="hidden sm:inline">Entrar ou cadastrar</span>
            </Link>
          )}
          <Link href="/publicar" className={buttonClasses({ variant: "secondary", size: "md" })}>
            <Plus className="size-4" aria-hidden /> <span className="hidden sm:inline">Publicar</span>
            <span className="sr-only sm:hidden">Publicar oferta</span>
          </Link>
        </div>
      </div>
      <nav aria-label="Seções" className="mx-auto flex h-(--header-nav) max-w-(--layout-max) items-center gap-5 overflow-x-auto px-4 text-sm [scrollbar-width:none]">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex shrink-0 items-center gap-1.5 hover:text-accent">
            <Icon className="size-4 text-muted" aria-hidden /> {label}
          </Link>
        ))}
        <Link href="/black-friday" className="flex shrink-0 items-center gap-1.5 font-bold text-accent">Black Friday</Link>
      </nav>
    </header>
  );
}

"use client";
import { BellPlus, Menu, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuDrawer, type MenuCategory } from "./menu-drawer";

/** Barra fixa de navegação no celular: o que a pessoa mais usa com o polegar. */
export function BottomNav({ categories, loggedIn, isStaff = false, unread }: { categories: MenuCategory[]; loggedIn: boolean; isStaff?: boolean; unread: number }) {
  const path = usePathname();
  const item = "flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium";
  const active = (p: string) => (path === p || path.startsWith(`${p}/`) ? "text-accent" : "text-text");
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-bg md:hidden">
      <MenuDrawer categories={categories} loggedIn={loggedIn} isStaff={isStaff} unread={unread} className={`${item} text-text`} label="Abrir menu">
        <Menu className="size-6" aria-hidden /> Menu
      </MenuDrawer>
      <Link href="/alertas" className={`${item} relative ${active("/alertas")}`}>
        <BellPlus className="size-6" aria-hidden /> Alertas
        {unread > 0 ? <span className="absolute left-1/2 top-2 ml-2 size-2.5 rounded-pill bg-accent" aria-label={`${unread} notificações novas`} /> : null}
      </Link>
      <Link href="/publicar" className={`${item} ${active("/publicar")}`}>
        <span className="grid size-6 place-items-center rounded-xs border-2 border-current"><Plus className="size-4" aria-hidden /></span> Publicar
      </Link>
      <Link href={loggedIn ? "/conta" : "/entrar"} className={`${item} ${active(loggedIn ? "/conta" : "/entrar")}`}>
        <User className="size-6" aria-hidden /> {loggedIn ? "Conta" : "Entrar"}
      </Link>
    </nav>
  );
}
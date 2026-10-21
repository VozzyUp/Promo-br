"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { ACCOUNT_NAV } from "@/lib/account-nav";

const itemClass = "block rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface";

/** Menu do avatar: perfil, páginas da conta, painel (equipe) e sair. */
export function AccountMenu({ username, displayName, isStaff }: { username: string; displayName: string; isStaff: boolean }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="flex items-center gap-1.5 rounded-pill px-1.5 py-1 text-sm font-bold hover:bg-surface" aria-label="Menu da conta">
          <span className="grid size-7 place-items-center rounded-pill bg-surface text-sm font-bold" aria-hidden>
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden sm:inline">@{username}</span>
          <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-60 rounded-card bg-bg p-2 shadow-card-hover">
          <DropdownMenu.Item asChild>
            <Link href={`/u/${username}`} className={itemClass}>Meu perfil público</Link>
          </DropdownMenu.Item>
          {ACCOUNT_NAV.map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <Link href={item.href} className={itemClass}>{item.label}</Link>
            </DropdownMenu.Item>
          ))}
          {isStaff ? (
            <DropdownMenu.Item asChild>
              <Link href="/painel" className={itemClass}>Painel da equipe</Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <form action={logoutAction}>
            <DropdownMenu.Item asChild>
              <button type="submit" className={`${itemClass} w-full text-left text-danger`}>Sair</button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Barra lateral de /conta, com a página atual destacada. */
export function AccountSideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Conta" className="flex gap-1 overflow-x-auto md:w-52 md:shrink-0 md:flex-col md:overflow-visible">
      {ACCOUNT_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-pill px-4 py-2 text-sm ${active ? "bg-accent-soft font-bold text-accent" : "text-muted hover:bg-surface hover:text-text"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

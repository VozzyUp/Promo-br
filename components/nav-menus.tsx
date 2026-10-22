"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { MENU_ICONS } from "./menu-icons";

export type NavMenuItem = { href: string; label: string; icon?: string };

/**
 * Item da barra de seções que abre um painel com as opções (categorias, lojas com cupom, tipos de grátis).
 * No celular o painel ocupa a tela entre o topo e a barra inferior; no computador, uma gaveta à esquerda.
 */
export function NavMenu({
  label, icon, seeAll, items, chevrons = false,
}: { label: string; icon: string; seeAll: string; items: NavMenuItem[]; chevrons?: boolean }) {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(56);
  const TriggerIcon = MENU_ICONS[icon];
  const onOpenChange = (next: boolean) => {
    // O painel começa logo abaixo da linha do logo e da busca (que pode ter a faixa da Black Friday acima).
    if (next) setTop(Math.max(0, Math.round(document.getElementById("topo")?.getBoundingClientRect().bottom ?? 56)));
    setOpen(next);
  };
  const close = () => setOpen(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className="group flex shrink-0 items-center gap-1.5 hover:text-accent data-[state=open]:text-accent">
        {TriggerIcon ? <TriggerIcon className="size-4 text-muted" aria-hidden /> : null}
        {label}
        <ChevronDown className="size-3.5 text-muted transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 hidden bg-black/40 md:block" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ "--menu-top": `${top}px` } as CSSProperties}
          className="fixed inset-x-0 bottom-16 top-(--menu-top) z-50 flex flex-col bg-bg md:inset-x-auto md:inset-y-0 md:left-0 md:w-80 md:shadow-card"
        >
          <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-surface pl-4 pr-2">
            <Dialog.Title className="text-title font-bold">{label}</Dialog.Title>
            <Link href={seeAll} onClick={close} className="text-sm font-bold text-accent hover:underline">Ver todos</Link>
            <Dialog.Close className="ml-auto grid size-11 place-items-center rounded-pill hover:bg-bg" aria-label={`Fechar ${label}`}>
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <nav aria-label={label} className="flex-1 overflow-y-auto overscroll-contain py-1">
            {items.length === 0 ? <p className="px-4 py-6 text-muted">Nada por aqui ainda.</p> : null}
            <ul>
              {items.map((it) => {
                const Icon = it.icon ? MENU_ICONS[it.icon] : null;
                return (
                  <li key={it.href}>
                    <Link href={it.href} onClick={close} className="flex min-h-14 items-center gap-3 px-4 text-base hover:bg-surface md:min-h-12">
                      {Icon ? <Icon className="size-5 shrink-0 text-muted" aria-hidden /> : null}
                      <span className="flex-1">{it.label}</span>
                      {chevrons ? <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

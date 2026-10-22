import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MENU_ICONS } from "@/components/menu-icons";
import { listCategories } from "@/lib/data";
import { categoryIcon } from "@/lib/menus";

export const metadata = { title: "Categorias", description: "Todas as categorias de ofertas e cupons." };

export default async function CategoriesPage() {
  const categories = await listCategories().catch(() => []);
  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold md:text-display">Categorias</h1>
      {categories.length === 0 ? <p className="text-muted">Nenhuma categoria cadastrada ainda.</p> : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {categories.map((c) => {
          const Icon = MENU_ICONS[categoryIcon(c.slug)];
          return (
            <li key={c.slug}>
              <Link href={`/c/${c.slug}`} className="flex min-h-14 items-center gap-3 rounded-card border border-border bg-bg px-4 hover:border-accent">
                {Icon ? <Icon className="size-5 shrink-0 text-muted" aria-hidden /> : null}
                <span className="flex-1 font-bold">{c.name}</span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

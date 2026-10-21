import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { countOpenReports } from "@/lib/data/moderation";

export default async function PanelLayout({ children }: LayoutProps<"/painel">) {
  const session = await requireModerator();
  const open = await countOpenReports();
  const tab = "rounded-pill px-4 py-1.5 text-sm font-bold hover:bg-surface";
  return (
    <>
      <nav aria-label="Painel" className="mx-auto flex max-w-(--layout-max) gap-1 px-4 pt-6">
        <Link href="/painel" className={tab}>Fila de ofertas</Link>
        {session.role === "admin" ? <Link href="/painel/lojas" className={tab}>Lojas</Link> : null}
        <Link href="/painel/denuncias" className={tab}>
          Denúncias
          {open > 0 ? <span className="ml-1.5 rounded-pill bg-accent px-1.5 py-0.5 text-xs text-on-accent">{open}</span> : null}
        </Link>
      </nav>
      {children}
    </>
  );
}

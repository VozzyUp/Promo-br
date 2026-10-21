import Link from "next/link";
import { PrefsForm } from "@/components/forms/prefs-form";
import { requireUser } from "@/lib/auth";
import { getPrefs } from "@/lib/data/social";

export const metadata = { title: "Ajustes" };

const TABS = [
  { id: "preferencias", label: "Preferências" },
  { id: "notificacoes", label: "Notificações" },
] as const;

export default async function SettingsPage({ searchParams }: PageProps<"/conta/ajustes">) {
  const session = await requireUser("/conta/ajustes");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.aba)?.id ?? "preferencias";
  const prefs = await getPrefs(session.userId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Ajustes</h1>
      <nav aria-label="Seções dos ajustes" className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/conta/ajustes?aba=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`shrink-0 rounded-pill px-4 py-1.5 text-sm ${t.id === tab ? "bg-surface font-bold" : "text-muted hover:bg-surface"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "preferencias" ? (
        <div className="flex flex-col gap-4">
          <section aria-labelledby="feed-title" className="rounded-card bg-bg p-4 shadow-card md:p-6">
            <h2 id="feed-title" className="mb-3 text-title font-bold">Feed e lateral</h2>
            <PrefsForm section="feed" prefs={prefs} />
          </section>
          <section aria-labelledby="priv-title" className="rounded-card bg-bg p-4 shadow-card md:p-6">
            <h2 id="priv-title" className="mb-3 text-title font-bold">Privacidade</h2>
            <PrefsForm section="privacy" prefs={prefs} />
          </section>
        </div>
      ) : (
        <section aria-labelledby="not-title" className="rounded-card bg-bg p-4 shadow-card md:p-6">
          <h2 id="not-title" className="mb-3 text-title font-bold">O que avisar no Buzón</h2>
          <PrefsForm section="notify" prefs={prefs} />
        </section>
      )}
    </div>
  );
}

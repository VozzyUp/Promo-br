import Link from "next/link";
import { unblockDomainAction } from "@/app/actions/admin";
import { BlockDomainForm } from "@/components/admin/block-domain-form";
import { StoreForm } from "@/components/admin/store-form";
import { requireAdmin } from "@/lib/auth";
import { listAdminStores, listBlockedDomains } from "@/lib/data/admin";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: lojas" };

const STATUS_LABEL = { active: "Ativa", pending_review: "Esperando revisão", blocked: "Bloqueada" } as const;

export default async function PanelStoresPage() {
  await requireAdmin();
  if (!supabaseEnabled()) {
    return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Lojas e domínios bloqueados precisam do Supabase configurado.</p>;
  }
  const [stores, blocked] = await Promise.all([listAdminStores(), listBlockedDomains()]);
  const waiting = stores.filter((s) => s.status === "pending_review").length;
  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-8 px-4 py-8">
      <section aria-labelledby="lojas-t">
        <h1 id="lojas-t" className="text-xl font-bold">Lojas</h1>
        <p className="mb-4 text-sm text-muted">
          {waiting > 0 ? `${waiting} loja(s) nova(s) esperando revisão. ` : ""}
          O link que o usuário cola nunca é alterado quando a política é “manter o link do autor”.
        </p>
        <ul className="flex flex-col gap-3">
          {stores.map((s) => (
            <li key={s.id} className="rounded-card bg-bg p-4 shadow-card">
              <details open={s.status === "pending_review"}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">{s.name}</span>
                  <span className={`rounded-pill px-2 py-0.5 text-xs font-bold ${s.status === "active" ? "bg-surface text-muted" : s.status === "blocked" ? "bg-danger text-on-accent" : "bg-accent text-on-accent"}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                  <span className="text-sm text-muted">{s.domains.join(", ") || "sem domínio"} · {s.deals} oferta(s)</span>
                </summary>
                {s.status === "active" ? <p className="mt-3"><Link href={`/loja/${s.slug}`} className="text-sm font-bold text-accent hover:underline">Ver a página pública da loja</Link></p> : null}
                <div className="mt-4"><StoreForm store={s} /></div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="bloq-t" className="rounded-card bg-bg p-4 shadow-card">
        <h2 id="bloq-t" className="text-title font-bold">Domínios bloqueados</h2>
        <p className="mb-4 text-sm text-muted">Links destes endereços (e dos subdomínios) são recusados na publicação.</p>
        <BlockDomainForm />
        <ul className="mt-4 divide-y divide-border">
          {blocked.length === 0 ? <li className="py-2 text-sm text-muted">Nenhum domínio bloqueado.</li> : null}
          {blocked.map((b) => (
            <li key={b.domain} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span><strong>{b.domain}</strong> <span className="text-muted">· {b.reason}</span></span>
              <form action={unblockDomainAction}>
                <input type="hidden" name="domain" value={b.domain} />
                <button type="submit" className="font-bold text-accent hover:underline">Desbloquear</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

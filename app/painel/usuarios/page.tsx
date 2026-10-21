import { userStaffAction } from "@/app/actions/staff";
import { requireModerator } from "@/lib/auth";
import { listStaffUsers } from "@/lib/data/staff";
import { timeAgo } from "@/lib/format";
import { supabaseEnabled } from "@/lib/supabase/server";

export const metadata = { title: "Painel: usuários" };

const input = "h-9 rounded-sm border border-border-input bg-bg px-2 text-sm";
const btn = "h-9 rounded-pill px-3 text-sm font-bold hover:bg-surface";

export default async function PanelUsersPage({ searchParams }: PageProps<"/painel/usuarios">) {
  const me = await requireModerator();
  if (!supabaseEnabled()) return <p className="mx-auto max-w-(--layout-max) px-4 py-8 text-sm text-muted">Precisa do Supabase configurado.</p>;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim();
  const banned = one(sp.suspensos) === "1";
  const users = await listStaffUsers(q, banned);
  return (
    <div className="mx-auto max-w-(--layout-max) px-4 py-8">
      <h1 className="text-xl font-bold">Usuários</h1>
      <form className="my-4 flex flex-wrap items-end gap-2" role="search">
        <div><label htmlFor="u-q" className="mb-1 block text-sm font-bold">Nome de usuário</label><input id="u-q" name="q" defaultValue={q} className={`${input} w-56`} /></div>
        <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" name="suspensos" value="1" defaultChecked={banned} /> Só suspensos</label>
        <button type="submit" className="h-9 rounded-pill bg-accent px-5 text-sm font-bold text-on-accent">Buscar</button>
      </form>
      <ul className="flex flex-col gap-3">
        {users.length === 0 ? <li className="text-sm text-muted">Nenhum usuário encontrado.</li> : null}
        {users.map((u) => (
          <li key={u.id} className="rounded-card bg-bg p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <a href={`/u/${u.username}`} className="font-bold hover:text-accent">@{u.username}</a>
                <p className="text-sm text-muted">
                  {u.role === "admin" ? "Admin" : u.role === "moderator" ? "Moderador" : "Usuário"} · {u.reputation} pts · {u.approvedPosts} aprovadas · entrou {timeAgo(u.createdAt)}
                  {u.trusted ? " · confiável" : ""}{u.bannedAt ? ` · suspenso (${u.banReason ?? "sem motivo"})` : ""}
                </p>
              </div>
              {u.id !== me.userId ? (
                <div className="flex flex-wrap items-center gap-1">
                  <form action={userStaffAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button name="act" value={u.trusted ? "untrust" : "trust"} className={btn}>{u.trusted ? "Tirar confiança" : "Marcar confiável"}</button>
                  </form>
                  {u.bannedAt ? (
                    <form action={userStaffAction}><input type="hidden" name="id" value={u.id} /><button name="act" value="unban" className={btn}>Reativar</button></form>
                  ) : (
                    <form action={userStaffAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={u.id} />
                      <label htmlFor={`b-${u.id}`} className="sr-only">Motivo da suspensão</label>
                      <input id={`b-${u.id}`} name="reason" placeholder="Motivo" className={`${input} w-36`} />
                      <button name="act" value="ban" className={`${btn} text-danger`}>Suspender</button>
                    </form>
                  )}
                  {me.role === "admin" ? (
                    <form action={userStaffAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={u.id} /><input type="hidden" name="act" value="role" />
                      <label htmlFor={`r-${u.id}`} className="sr-only">Papel</label>
                      <select id={`r-${u.id}`} name="role" defaultValue={u.role === "system" ? "user" : u.role} className={input}>
                        <option value="user">Usuário</option><option value="moderator">Moderador</option><option value="admin">Admin</option>
                      </select>
                      <button className={btn}>Aplicar</button>
                    </form>
                  ) : null}
                </div>
              ) : <span className="text-sm text-muted">você</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
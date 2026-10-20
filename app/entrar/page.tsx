import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/auth-forms";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  if (await getSession()) redirect(next);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-1 text-xl font-bold">Entrar</h1>
        <p className="mb-6 text-sm text-muted">Para votar, comentar e publicar ofertas.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}

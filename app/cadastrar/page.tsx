import { redirect } from "next/navigation";
import { SignupForm } from "@/components/forms/auth-forms";
import { GoogleButton } from "@/components/forms/google-button";
import { getSession, googleLoginEnabled } from "@/lib/auth";
import { safeNext } from "@/lib/links";

export const metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }: PageProps<"/cadastrar">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSession()) redirect(next);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-1 text-xl font-bold">Criar conta</h1>
        <p className="mb-6 text-sm text-muted">Publique as promoções que você encontra e use o seu link de afiliado.</p>
        {googleLoginEnabled() ? <GoogleButton next={next} /> : null}
        <SignupForm next={next} />
      </div>
    </div>
  );
}

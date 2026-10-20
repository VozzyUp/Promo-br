import { NewPasswordForm } from "@/components/forms/auth-forms";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Nova senha" };

// Chega aqui pelo link do e-mail de recuperação: /auth/confirm já abriu a sessão.
export default async function NewPasswordPage() {
  await requireUser("/nova-senha");
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-1 text-xl font-bold">Crie uma senha nova</h1>
        <p className="mb-6 text-sm text-muted">Depois de salvar, você continua conectado.</p>
        <NewPasswordForm />
      </div>
    </div>
  );
}

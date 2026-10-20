import { ForgotPasswordForm } from "@/components/forms/auth-forms";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-1 text-xl font-bold">Recuperar senha</h1>
        <p className="mb-6 text-sm text-muted">Mandamos um link para você criar uma senha nova.</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

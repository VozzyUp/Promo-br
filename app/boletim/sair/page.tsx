import { NewsletterConfirm } from "@/components/newsletter-confirm";

export const metadata = { title: "Cancelar inscrição", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/boletim/sair">) {
  const sp = await searchParams;
  const t = typeof sp.t === "string" ? sp.t : "";
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="flex flex-col gap-4 rounded-card bg-bg p-6 shadow-card">
        <h1 className="text-xl font-bold">Cancelar inscrição no boletim</h1>
        <p className="text-sm text-muted">Clique para parar de receber o boletim neste e-mail. Dá para se inscrever de novo quando quiser.</p>
        <NewsletterConfirm token={t} mode="unsubscribe" />
      </div>
    </div>
  );
}
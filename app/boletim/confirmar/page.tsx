import { NewsletterConfirm } from "@/components/newsletter-confirm";

export const metadata = { title: "Confirmar inscrição", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/boletim/confirmar">) {
  const sp = await searchParams;
  const t = typeof sp.t === "string" ? sp.t : "";
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="flex flex-col gap-4 rounded-card bg-bg p-6 shadow-card">
        <h1 className="text-xl font-bold">Confirmar inscrição no boletim</h1>
        <p className="text-sm text-muted">Falta só um clique para você receber, toda segunda-feira, as ofertas mais quentes da semana.</p>
        <NewsletterConfirm token={t} mode="confirm" />
      </div>
    </div>
  );
}
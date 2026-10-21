import Link from "next/link";
import { DEFAULT_BF, getSetting, type BfSettings } from "@/lib/data/settings";

/** Faixa de campanha no topo do site, ligada e escrita pelo painel. */
export async function BfBanner() {
  const bf = await getSetting<BfSettings>("public.bf", DEFAULT_BF);
  if (!bf.enabled) return null;
  return (
    <div className="bg-accent text-on-accent">
      <p className="mx-auto flex max-w-(--layout-max) flex-wrap items-center justify-center gap-x-3 px-4 py-2 text-center text-sm">
        <strong>{bf.title}</strong>
        <span>{bf.text}</span>
        <Link href="/black-friday" className="font-bold underline">Ver ofertas</Link>
      </p>
    </div>
  );
}
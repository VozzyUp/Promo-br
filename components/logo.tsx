import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

/** Logo: símbolo + nome do site (o nome é editável em Painel > Aparência). */
export function Logo({ name }: { name: string }) {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-text" aria-label={`${name}, página inicial`}>
      <LogoMark className="size-8 shrink-0" />
      <span className="truncate">{name}</span>
    </Link>
  );
}

import { notFound } from "next/navigation";
import { StubPage } from "@/components/stub-page";

// Rotas do inventário (replica/recon.md) que ainda não foram construídas. Cada uma ganha o próprio arquivo quando for feita.
const stubs: { match: RegExp; screen: string; title: string }[] = [
  { match: /^c\/[\w-]+$/, screen: "S03", title: "Ofertas por categoria" },
  { match: /^loja\/[\w-]+$/, screen: "S04", title: "Ofertas e cupons da loja" },
  { match: /^cupons$/, screen: "S05", title: "Cupons" },
  { match: /^alertas$/, screen: "S07", title: "Alertas de oferta" },
  { match: /^u\/[\w-]+$/, screen: "S09", title: "Perfil" },
  { match: /^busca$/, screen: "S10", title: "Busca" },
  { match: /^black-friday$/, screen: "S11", title: "Black Friday" },
  { match: /^sobre$/, screen: "S13", title: "Sobre e termos de uso" },
  { match: /^privacidade$/, screen: "S13", title: "Política de privacidade" },
  { match: /^como-ganhamos-dinheiro$/, screen: "S13", title: "Como ganhamos dinheiro" },
  { match: /^gratis$/, screen: "—", title: "Grátis" },
  { match: /^discussoes$/, screen: "—", title: "Discussões" },
];

export default async function Stub({ params }: PageProps<"/[...rest]">) {
  const { rest } = await params;
  const path = rest.join("/");
  const stub = stubs.find((s) => s.match.test(path));
  if (!stub) notFound();
  return <StubPage title={stub.title} screen={stub.screen} />;
}

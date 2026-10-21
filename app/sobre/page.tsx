import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Sobre", description: "Quem somos e como o site funciona." };

export default function AboutPage() {
  return (
    <LegalPage title="Sobre o promo-br">
      <p>O promo-br é um site de ofertas e cupons feito pela comunidade. Quem acha uma promoção boa publica, quem a usa vota, e as melhores sobem.</p>
      <h2>Como funciona</h2>
      <ul>
        <li>Qualquer pessoa com conta pode publicar uma oferta, um cupom ou abrir uma discussão.</li>
        <li>As primeiras publicações passam por moderação. Depois de algumas aprovadas, as suas saem na hora.</li>
        <li>Conferimos o preço em outras lojas. Desconto inflado, com o preço “de” aumentado para parecer promoção, não é publicado.</li>
        <li>A temperatura da oferta vem dos votos da comunidade, não de quem paga mais.</li>
      </ul>
      <h2>Seu link é seu</h2>
      <p>Se você publica uma oferta com o seu link de afiliado, ele é mantido exatamente como você colou. Nós não trocamos o link de ninguém.</p>
      <p>Veja também <Link href="/como-ganhamos-dinheiro" className="font-bold text-accent">como ganhamos dinheiro</Link>, as <Link href="/conduta" className="font-bold text-accent">regras de conduta</Link> e os <Link href="/termos" className="font-bold text-accent">termos de uso</Link>.</p>
    </LegalPage>
  );
}

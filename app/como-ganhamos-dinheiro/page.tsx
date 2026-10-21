import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Como ganhamos dinheiro", description: "De onde vem a receita do site e o que ela não muda." };

export default function RevenuePage() {
  return (
    <LegalPage title="Como ganhamos dinheiro">
      <p>O site é gratuito para quem usa. Para se manter, ele tem duas fontes de receita:</p>
      <ul>
        <li><strong>Anúncios.</strong> Exibimos publicidade nas páginas, sempre identificada como anúncio.</li>
        <li><strong>Comissões de afiliados.</strong> Em ofertas que nós mesmos publicamos, alguns links podem nos render uma comissão quando você compra, sem custo extra para você.</li>
      </ul>
      <h2>O que isso não muda</h2>
      <ul>
        <li>A ordem das ofertas vem dos votos da comunidade e do desconto real, não de quem nos paga.</li>
        <li>Links publicados por usuários nunca são alterados: a tag de afiliado de quem publicou é mantida.</li>
        <li>Não aceitamos dinheiro para marcar uma oferta como verificada.</li>
      </ul>
      <p>Se alguma coisa não estiver clara, fale com a gente pelas discussões do site.</p>
    </LegalPage>
  );
}

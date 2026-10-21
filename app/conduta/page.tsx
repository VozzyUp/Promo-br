import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Regras de conduta" };

export default function ConductPage() {
  return (
    <LegalPage title="Regras de conduta" updated="20 de outubro de 2026">
      <p>Queremos uma comunidade útil e respeitosa. Estas regras valem para ofertas, cupons, discussões, comentários e mensagens.</p>
      <h2>O que não pode</h2>
      <ul>
        <li>Desconto falso ou inflado: preço “de” aumentado para parecer promoção.</li>
        <li>Spam, propaganda disfarçada e o mesmo conteúdo repetido.</li>
        <li>Trocar o link de afiliado de outra pessoa ou usar redirecionadores para disfarçar o destino.</li>
        <li>Ofensas, assédio, discriminação ou exposição de dados de outras pessoas.</li>
        <li>Produtos ilegais, falsificados ou perigosos.</li>
        <li>Criar várias contas para votar ou comentar em causa própria.</li>
      </ul>
      <h2>O que ajuda</h2>
      <ul>
        <li>Título claro, com produto e detalhe principal.</li>
        <li>Informar frete, condições e validade quando souber.</li>
        <li>Avisar quando a oferta acabar ou o cupom parar de funcionar.</li>
      </ul>
      <h2>Denúncias e consequências</h2>
      <p>Use o botão de denunciar. Conteúdo que quebra as regras é escondido ou removido, e reincidência pode levar à suspensão da conta.</p>
    </LegalPage>
  );
}

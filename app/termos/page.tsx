import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso" updated="20 de outubro de 2026">
      <p>Ao criar uma conta ou usar o site, você concorda com estes termos.</p>
      <h2>Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais, ou autorização de quem responde por você.</li>
        <li>Mantenha a sua senha em segurança. O que acontece na sua conta é de sua responsabilidade.</li>
      </ul>
      <h2>O que você publica</h2>
      <ul>
        <li>Você garante que pode publicar o que posta e que as informações são verdadeiras até onde você sabe.</li>
        <li>Você nos dá permissão para exibir o conteúdo no site. Ele continua sendo seu.</li>
        <li>Ofertas e preços podem mudar ou acabar a qualquer momento. Não garantimos estoque nem preço.</li>
      </ul>
      <h2>Lojas e compras</h2>
      <p>As compras são feitas diretamente nas lojas. Não vendemos produtos nem respondemos por entrega, troca ou garantia.</p>
      <h2>Moderação</h2>
      <p>Podemos recusar, esconder ou remover conteúdo e suspender contas que violem estes termos ou as regras de conduta.</p>
      <h2>Mudanças</h2>
      <p>Podemos atualizar estes termos. Quando a mudança for relevante, avisaremos no site.</p>
    </LegalPage>
  );
}

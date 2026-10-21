import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacidade", description: "Quais dados coletamos, para quê e como você os controla." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade" updated="20 de outubro de 2026">
      <p>Esta página explica, em linguagem direta, como tratamos os seus dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD).</p>
      <h2>O que coletamos</h2>
      <ul>
        <li><strong>Conta:</strong> e-mail, nome de usuário, nome de exibição e, se você quiser, foto e biografia.</li>
        <li><strong>O que você faz no site:</strong> ofertas, comentários, votos, ofertas salvas, alertas, mensagens e preferências.</li>
        <li><strong>Cliques em ofertas:</strong> registramos o clique de forma estatística, com um código que não identifica você diretamente.</li>
        <li><strong>Anúncios e cookies:</strong> parceiros de publicidade podem usar cookies. Você escolhe o que aceitar no aviso de cookies.</li>
      </ul>
      <h2>Para que usamos</h2>
      <p>Para fazer o site funcionar (entrar na conta, publicar, notificar você), manter a comunidade segura (combater spam e abuso) e medir o uso. Não vendemos os seus dados.</p>
      <h2>Seus direitos</h2>
      <ul>
        <li>Baixar uma cópia dos seus dados em <strong>Conta → Exportar</strong>.</li>
        <li>Corrigir seus dados em <strong>Conta → Ajustes</strong>.</li>
        <li>Apagar a sua conta em <strong>Conta → Ajustes</strong>. Suas ofertas ficam sem autor e seus comentários aparecem como “usuário removido”; o restante dos dados é apagado.</li>
      </ul>
      <h2>Por quanto tempo guardamos</h2>
      <p>Enquanto a conta existir. Depois de apagada, removemos os dados pessoais, exceto o que a lei nos obriga a guardar.</p>
      <h2>Contato</h2>
      <p>Dúvidas ou pedidos sobre seus dados: use a área de discussões do site e marque a equipe.</p>
    </LegalPage>
  );
}

// Textos padrão das páginas institucionais. O painel pode substituir cada um; "restaurar padrão" volta para estes.
export type LegalSlug = "sobre" | "como-ganhamos-dinheiro" | "privacidade" | "termos" | "conduta";

export type LegalDoc = { title: string; description: string; updated?: string; body: string };

export const LEGAL_SLUGS: LegalSlug[] = ["sobre", "como-ganhamos-dinheiro", "privacidade", "termos", "conduta"];

export const LEGAL_DEFAULTS: Record<LegalSlug, LegalDoc> = {
  sobre: {
    title: "Sobre o PromoValeu",
    description: "Quem somos e como o site funciona.",
    body: `O PromoValeu é um site de ofertas e cupons feito pela comunidade. Quem acha uma promoção boa publica, quem a usa vota, e as melhores sobem.

## Como funciona
- Qualquer pessoa com conta pode publicar uma oferta, um cupom ou abrir uma discussão.
- As primeiras publicações passam por moderação. Depois de algumas aprovadas, as suas saem na hora.
- Comparamos o preço com o histórico do próprio produto. Desconto inflado, com o preço “de” aumentado para parecer promoção, não é publicado.
- A temperatura da oferta vem dos votos da comunidade, não de quem paga mais.

## Seu link é seu
Se você publica uma oferta com o seu link de afiliado, ele é mantido exatamente como você colou. Nós não trocamos o link de ninguém.

Veja também [como ganhamos dinheiro](/como-ganhamos-dinheiro), as [regras de conduta](/conduta) e os [termos de uso](/termos).`,
  },
  "como-ganhamos-dinheiro": {
    title: "Como ganhamos dinheiro",
    description: "De onde vem a receita do site e o que ela não muda.",
    body: `O site é gratuito para quem usa. Para se manter, ele tem duas fontes de receita:
- **Anúncios.** Exibimos publicidade nas páginas, sempre identificada como anúncio.
- **Comissões de afiliados.** Em ofertas que nós mesmos publicamos, alguns links podem nos render uma comissão quando você compra, sem custo extra para você.

## O que isso não muda
- A ordem das ofertas vem dos votos da comunidade e do desconto real, não de quem nos paga.
- Links publicados por usuários nunca são alterados: a tag de afiliado de quem publicou é mantida.
- Não aceitamos dinheiro para marcar uma oferta como verificada.

Se alguma coisa não estiver clara, fale com a gente pelas discussões do site.`,
  },
  privacidade: {
    title: "Política de privacidade",
    description: "Quais dados coletamos, para quê e como você os controla.",
    updated: "20 de outubro de 2026",
    body: `Esta página explica, em linguagem direta, como tratamos os seus dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD).

## O que coletamos
- **Conta:** e-mail, nome de usuário, nome de exibição e, se você quiser, foto e biografia.
- **O que você faz no site:** ofertas, comentários, votos, ofertas salvas, alertas, mensagens e preferências.
- **Cliques em ofertas:** registramos o clique de forma estatística, com um código que não identifica você diretamente.
- **Anúncios e cookies:** parceiros de publicidade podem usar cookies. Você escolhe o que aceitar no aviso de cookies e pode mudar a escolha a qualquer momento em “Preferências de cookies”, no rodapé.

## Para que usamos
Para fazer o site funcionar (entrar na conta, publicar, notificar você), manter a comunidade segura (combater spam e abuso) e medir o uso. Não vendemos os seus dados.

## Seus direitos
- Baixar uma cópia dos seus dados em **Conta → Exportar**.
- Corrigir seus dados em **Conta → Ajustes**.
- Apagar a sua conta em **Conta → Ajustes**. Suas ofertas ficam sem autor e seus comentários aparecem como “usuário removido”; o restante dos dados é apagado.

## Por quanto tempo guardamos
Enquanto a conta existir. Depois de apagada, removemos os dados pessoais, exceto o que a lei nos obriga a guardar.

## Contato
Dúvidas ou pedidos sobre seus dados: use a área de discussões do site e marque a equipe.`,
  },
  termos: {
    title: "Termos de uso",
    description: "As regras para usar o site.",
    updated: "20 de outubro de 2026",
    body: `Ao criar uma conta ou usar o site, você concorda com estes termos.

## Sua conta
- Você precisa ter 18 anos ou mais, ou autorização de quem responde por você.
- Mantenha a sua senha em segurança. O que acontece na sua conta é de sua responsabilidade.

## O que você publica
- Você garante que pode publicar o que posta e que as informações são verdadeiras até onde você sabe.
- Você nos dá permissão para exibir o conteúdo no site. Ele continua sendo seu.
- Ofertas e preços podem mudar ou acabar a qualquer momento. Não garantimos estoque nem preço.

## Lojas e compras
As compras são feitas diretamente nas lojas. Não vendemos produtos nem respondemos por entrega, troca ou garantia.

## Moderação
Podemos recusar, esconder ou remover conteúdo e suspender contas que violem estes termos ou as regras de conduta.

## Mudanças
Podemos atualizar estes termos. Quando a mudança for relevante, avisaremos no site.`,
  },
  conduta: {
    title: "Regras de conduta",
    description: "O que pode e o que não pode na comunidade.",
    updated: "20 de outubro de 2026",
    body: `Queremos uma comunidade útil e respeitosa. Estas regras valem para ofertas, cupons, discussões, comentários e mensagens.

## O que não pode
- Desconto falso ou inflado: preço “de” aumentado para parecer promoção.
- Spam, propaganda disfarçada e o mesmo conteúdo repetido.
- Trocar o link de afiliado de outra pessoa ou usar redirecionadores para disfarçar o destino.
- Ofensas, assédio, discriminação ou exposição de dados de outras pessoas.
- Produtos ilegais, falsificados ou perigosos.
- Criar várias contas para votar ou comentar em causa própria.

## O que ajuda
- Título claro, com produto e detalhe principal.
- Informar frete, condições e validade quando souber.
- Avisar quando a oferta acabar ou o cupom parar de funcionar.

## Denúncias e consequências
Use o botão de denunciar. Conteúdo que quebra as regras é escondido ou removido, e reincidência pode levar à suspensão da conta.`,
  },
};

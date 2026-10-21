# Paridade com a referência (21/10/2026)

## Resumo

| Medida | Resultado |
| --- | --- |
| Funcionalidades (peso must 3, should 2, could 1) | **92,0 / 100**. Must-haves: 21 de 24 feitos |
| Estrutura do celular, home | de 35,5 para 38,7 (script de layout) |
| Estrutura do celular, página do cupom | de 22,9 para 28,6 |
| Desktop | **não medido**: a referência devolve a verificação anti-robô da Cloudflare ao navegador automatizado e isso não se contorna. Só há uma captura da home feita no navegador do usuário |

**Leitura honesta dos números de layout:** o script compara bordas de imagem. Ele subestima o que mudou, porque a referência mostra ofertas com fotos reais e o clone mostra ofertas de teste sem imagem (blocos cinzas com o nome da loja), e o clone tem o aviso de comissão e a faixa de anúncio em lugares diferentes. Por isso a conferência principal foi olhar as capturas lado a lado (`replica/screens` e `replica/clone-screens`, 390 x 844) e listar o que difere em estrutura.

**Veredito:** não pronto para lançar. Faltam 3 must-haves, e nenhum é de código: cadastro com SMTP próprio e Google (depende de você), revisão jurídica das páginas legais e o peso do ranking configurável no painel. Bugs S1 abertos: nenhum.

## O que estava diferente no celular e foi corrigido hoje

| # | Referência | Clone antes | Agora |
| --- | --- | --- | --- |
| 1 | Busca sempre visível no topo | **Não havia busca no celular** (campo escondido abaixo de 640 px) | Campo de busca no topo, ao lado do logo |
| 2 | Barra fixa embaixo: Menu, Alertas, Publicar, Conta | Só botões no cabeçalho | `components/bottom-nav.tsx` |
| 3 | Menu abre uma gaveta | **O botão Menu não fazia nada**, nem no desktop | Gaveta com seções, categorias, conta e páginas institucionais (`components/menu-drawer.tsx`) |
| 4 | Cartão: voto, imagem e ações numa coluna à esquerda; título, preço, loja e autor à direita; botão na largura toda | Imagem sem voto, etiqueta de tempo cortada, descrição e botão pequeno | Grade nova do cartão; descrição some no celular |
| 5 | Página da oferta sem moldura, em blocos de largura total | Cartões com margem | Blocos de borda a borda no celular |
| 6 | Botão de ação fixo embaixo ao rolar | Só no meio da página | Botão fixo que aparece quando o principal sai da tela e some no fim da página |
| 7 | Imagem do cupom quadrada e pequena | Quadrado cinza de 288 px quando não há imagem | Cartão de 160 px com o nome da loja |
| 8 | "Ofertas parecidas" no fim | Não havia | Bloco com 4 ofertas da mesma categoria |
| 9 | Autor com "membro desde" | Só o nome | Membro desde e ofertas aprovadas |
| 10 | Sem aviso de cookies cobrindo a tela | O aviso ocupava um quarto da tela | Aviso compacto, acima da barra inferior |

Testes novos: `e2e/mobile.spec.ts` (MOB-1 a MOB-4 e DSK-1). Suíte completa: 84 passam, 6 ignorados (os casos do celular não rodam no projeto desktop).

## O que ainda difere (estrutura, não identidade visual)

Celular
- A referência tem um título de seção cinza "Ofertas para você" acima da lista; o clone vai direto ao primeiro anúncio.
- Página do cupom: a referência mostra no autor a insígnia, os contadores (ofertas e comentários) e o avatar; o clone mostra nome e "membro desde". Falta também a linha "Mais detalhes em <loja>" com o logo e a barra "Novo comentário / Guardar" antes de "Ofertas parecidas".
- O quadrado da imagem usa o nome da loja quando não há foto; a referência usa o logo da loja. O logo da loja já é um campo no painel (Painel > Lojas), mas as lojas de teste não têm.

Desktop (só pela captura feita no navegador do usuário, sem medição)
- A referência mostra faixas de anúncio dos dois lados da coluna central; o clone só tem a coluna e a lateral direita.
- Abas (Para você, Mais quentes, Tendências, Todas) ficam dentro do cabeçalho branco da referência; no clone ficam num cartão abaixo do título.
- O clone mostra um título grande ("Promoção de verdade...") para quem não está logado; a referência mostra o mesmo para visitantes e o esconde para logados.

## Comportamento

| Fluxo | Referência | Clone |
| --- | --- | --- |
| Buscar no celular | 1 toque | 1 toque (era impossível) |
| Chegar ao botão da oferta numa página | botão no corpo e fixo | idem agora |
| Publicar | 1 toque na barra inferior | 1 toque na barra inferior |
| Cookies | sem aviso próprio visível | aviso compacto e recusar tão fácil quanto aceitar |
| Verificação do desconto | selo do site | selo pelo histórico real do anúncio, com gráfico (clone melhor) |

## Os cinco próximos passos

1. Título de seção e faixa de abas dentro do cabeçalho (desktop e celular).
2. Logo da loja como imagem padrão (subir os logos em Painel > Lojas).
3. Autor completo na página da oferta (insígnia e contadores) e barra "Novo comentário / Guardar".
4. Faixas de anúncio laterais no desktop (só depois do AdSense aprovado).
5. Rodar a skill replica-brand para trocar de vez cores, logo e tipografia: o layout agora está parecido o bastante para a identidade própria fazer diferença.
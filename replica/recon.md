# Recon: site de promoções (referência: promodescuentos.com)

Data: 2026-10-20 · Plataforma: web (mobile-first) · Mercado: Brasil
Objetivo: lançar antes da Black Friday (sexta, 27/11/2026) e monetizar com afiliados + anúncios.
Nome provisório da pasta: `promo-br` (marca a definir).

**Premissas do dono:**
- Projeto 100% novo. Não reaproveita nada de `Produtos/Afiliados`.
- **Sem n8n.** Captação, agendamentos, envios e métricas rodam **dentro do próprio app**.
- **Toda configuração pelo painel do site** (credenciais de afiliado, filtros, horários, canais, anúncios, marca, textos legais).
  Em variáveis de ambiente fica só o mínimo para subir: Supabase, `MASTER_KEY` (criptografa as credenciais salvas no painel) e o domínio.
- Hospedagem igual à Big Assessoria: imagem no `ghcr.io/vozzyup/...` via GitHub Actions, stack Portainer em Docker Swarm + Traefik, Supabase gerenciado.

**Atualização 20/10 — modelo central:** o conteúdo é **publicado pelos próprios usuários** (cadastro com e-mail e senha).
O usuário posta link, preço, cupom e **pode usar o próprio link de afiliado**. O dono também posta (e o robô ajuda a encher o site no começo).
A monetização forte do dono é **publicidade** (display + destaques patrocinados); comissão própria é complementar.
Comunidade (S06–S09, votos, comentários, denúncias, moderação) passa a ser **must para a BF**.

> **Regra clean-room.** Copiamos o *modelo* (comunidade de ofertas com votação e link de afiliado),
> não a marca, o layout pixel a pixel, os textos nem o código do Promodescuentos.

---

## 1. Leitura de mercado

- O modelo já existe no Brasil: o **Pelando** (parceiro do grupo Pepper desde 2015) e o **Promobit**. Um site genérico briga com eles de frente.
- Espaço real: **canal + nicho + confiança.**
  - Canal: promoção no Brasil circula em **canais/grupos de WhatsApp e Telegram**. O app dispara direto para eles.
  - Nicho: 3 ou 4 categorias em que o site seja a referência.
  - Confiança: **"desconto verificado"**. O app grava o preço todo dia; a página mostra o gráfico e barra o "metade do dobro" da BF.
- Black Friday 2026: em 5 semanas o Google não ranqueia o site. O tráfego da BF vem dos canais + Instagram/TikTok. O site recebe o clique, mostra anúncio e acumula SEO para 2027.

## 2. Fontes

| fonte | URL | o que dá |
| --- | --- | --- |
| Home pública | https://www.promodescuentos.com/ | abas "Para ti / Las más hot / Tendencias / Todas", cards, cupons no feed, "Crear alerta", "Publicar oferta" |
| Concorrente BR | https://www.pelando.com.br/ | mesmo modelo, UX local |
| Concorrente BR | https://www.promobit.com.br/ | foco em eletrônicos |
| Shopee Affiliate Open API | https://affiliate.shopee.com.br | API oficial GraphQL (AppId + secret, assinatura SHA256): busca de produtos com comissão, `generateShortLink` com subId, relatório de conversões |
| Amazon Associados | https://associados.amazon.com.br | link `?tag=`; API de produtos (Creators API) só após vendas qualificadas |
| Mercado Livre Afiliados | painel de afiliados ML | sem API oficial para gerar link; geração **manual** pelo painel (sem automação por sessão) |
| Redes | Awin, Lomadee, Rakuten, Admitad | feeds de produto/cupom de grandes varejistas (confirmar quais lojas cada rede tem) |

## 3. Inventário de telas

### Público

| ID | tela | rota | propósito | componentes-chave | estados |
| --- | --- | --- | --- | --- | --- |
| S01 | Home / feed | `/` | descobrir ofertas | abas (Pra você, Mais quentes, Em alta, Novas), DealCard, AdSlot a cada N cards | vazio, carregando, scroll infinito, mobile |
| S02 | Detalhe da oferta | `/oferta/[slug]` | decidir e clicar "Pegar oferta" | preço/antes/%off, botão afiliado, cupom, temperatura, gráfico de preço, relacionadas, CTA do canal | expirada, esgotada, cupom inválido |
| S03 | Categoria | `/c/[categoria]` | navegar (SEO) | filtros, ordenação | vazio |
| S04 | Loja | `/loja/[loja]` | ofertas + cupons de uma loja (SEO) | cabeçalho, cupons, ofertas | sem cupom |
| S05 | Cupons | `/cupons` | cupons por loja | CouponReveal | expirado |
| S06 | Publicar oferta | `/publicar` | usuário envia (pós-BF) | colar link → dados → moderação | duplicada, inválido, pendente |
| S07 | Alertas | `/alertas` | avisar sobre ofertas | palavra-chave, preço máx., canal | sem alertas |
| S08 | Login | `/entrar` | conta | Google, e-mail mágico | erro |
| S09 | Perfil | `/u/[user]` | reputação | ofertas, temperatura | — |
| S10 | Busca | `/busca?q=` | achar produto | resultados, "criar alerta" | sem resultado |
| S11 | Hub Black Friday | `/black-friday` | landing sazonal | contagem regressiva, categorias, verificadas, entrar no canal | antes/durante/depois |
| S12 | Redirect | `/ir/[codigo]` | contar clique e mandar à loja | (sem UI) | oferta expirada → página "acabou" + similares |
| S13 | Legais | `/sobre`, `/privacidade`, `/como-ganhamos-dinheiro` | LGPD + aviso de comissão | texto editável no painel | — |

### Painel (`/painel`), em que tudo é configurado

| ID | tela | propósito |
| --- | --- | --- |
| A01 | Visão geral | cliques, conversões, comissão estimada/confirmada, ofertas publicadas, por loja/canal/categoria/dia |
| A02 | Fila de ofertas | candidatas do robô e dos usuários: aprovar, editar título, marcar verificada, destacar, expirar, em lote |
| A03 | Nova oferta manual | colar link de qualquer loja → o app reconhece a loja e aplica o afiliado (ML/Amazon: tag configurada) |
| A04 | Cupons | CRUD, validade, verificação |
| A05 | Lojas | logo, domínio, rede, **modelo de link de afiliado** por loja |
| A06 | **Integrações** | Shopee (AppId/secret + "testar conexão"), Amazon (tag + credenciais da Creators API), ML (tag/ID), redes (token/feed URL), Telegram (token do bot + canal), WhatsApp (UAZAPI URL/token + canal/grupos), IA para textos (chave), tudo criptografado |
| A07 | **Robô de captação** | por fonte: ativo, horários (cron visual), categorias/palavras-chave, % mín. de desconto, comissão mín., preço máx., quantas por rodada, publicar direto ou ir para fila |
| A08 | **Canais de envio** | quais canais recebem, horários, limite por hora, modelo da mensagem, envio para a página do site ou direto para a loja |
| A09 | **Anúncios** | ID do AdSense, slots (posição, frequência no feed), ads.txt editável, liga/desliga por página |
| A10 | Aparência e SEO | nome, logo, cores, favicon, título/descrição padrão, categorias e menu, banner da BF |
| A11 | Páginas e textos | textos legais, "sobre", aviso de comissão, banner de cookies |
| A12 | Execuções | log de cada rodada do robô/envio/sync: sucesso, erros, quantas ofertas, botão "rodar agora" |
| A13 | Usuários e moderadores | papéis, banir, reputação |

## 4. Fluxos

```
F01 Visitante pega uma oferta (núcleo da receita)
    S01 -> S02 -> "Pegar oferta" -> S12 /ir/[codigo] (grava clique + subId) -> loja
    meta: 2 cliques. edge: expirou, cupom falhou, loja fora

F02 Robô capta ofertas (substitui o n8n)
    agendador interno (A07) -> fonte (Shopee API / feed de rede) -> normaliza -> grava PriceSnapshot
    -> pontua (desconto real vs histórico, comissão, vendas) -> dedup -> fila A02 ou publica
    -> gera link afiliado com subId = código do nosso redirect -> registro em A12

F03 Envio para canais
    oferta publicada -> regra de A08 -> mensagem (texto do modelo ou IA) -> Telegram Bot API / UAZAPI
    -> link aponta para S02 ou S12 (subId por canal)

F04 Sync de conversões
    agendador -> relatório de conversões da Shopee (e CSV importado para as outras) -> casa com o clique pelo subId -> A01

F05 Dono configura uma integração
    A06 -> cola credenciais -> "testar conexão" -> salvo criptografado -> fonte liga em A07

F06 Black Friday
    Instagram/TikTok -> S11 -> entra no canal -> ofertas -> S02 -> loja

F07 (pós-BF) Usuário publica / vota / cria alerta
    S08 -> S06 -> link trocado pelo nosso afiliado -> moderação A02 -> S02 ; votos -> temperatura ; S07 -> notificação
```

### S06 em detalhe (observado em 20/10/2026, conta do próprio usuário, nada publicado)

Fonte: uso da tela como usuário, em `/submission/add`. Sem leitura de código nem de chamadas internas.

**Passo 0. Tipo:** quatro cartões: Oferta, Cupom, Discussão e Oferta de indicação.
- A Oferta de indicação fica **bloqueada até o nível "Colaborador Prata"**. Os níveis de reputação liberam recursos.

**Oferta: assistente com 6 passos** e barra lateral de progresso.
- Passos: Link → Essenciais → Imagens → Descrição → Detalhes → Revisão.
- Passo concluído ganha ✓. Passo com erro ganha ⓘ vermelho.

1. **Link.**
   - Campo de URL com botão "Começar" e a opção "Não precisa de link".
   - Ao enviar, uma barra de progresso mostra **"checando possíveis duplicadas"** e depois **"obtendo preço"**. Ou seja: há busca de duplicata e leitura de preço a partir do link.
2. **Essenciais.**
   - Título obrigatório, com contador regressivo de 140.
   - Preço da oferta e preço normal.
     - O preço é formatado com milhar.
     - Um chip de **% de desconto** aparece ao vivo (-25%).
   - Cupom (opcional).
   - Disponibilidade: Online ou Loja física.
     - Online mostra frete e "enviado de" (país).
     - Loja física esconde esses dois campos.
   - Validação ao avançar: borda vermelha e "há um erro, verifique os campos obrigatórios". O erro some ao corrigir.
3. **Imagens.**
   - Até 8 imagens (cupom: 6).
   - Arrastar para reordenar e escolher a principal.
   - Upload ou "subir por link".
   - Limites: 6 MB, mínimo 150×150 e máximo 6000 px.
   - Opcional.
4. **Descrição.**
   - Editor rico com imagem, link, GIF/emoji, negrito, itálico, tachado, lista, @menção e divisor.
   - **Rascunho salvo automaticamente**, com a opção "ignorar a descrição recuperada".
5. **Detalhes.**
   - Data de início e de fim (opcionais).
   - **Categoria obrigatória**, com 15 opções.
     - A escolha é única.
     - Depois de escolher, os outros chips somem, com "clique para trocar".
6. **Revisão.**
   - Resumo por bloco, cada um com "Editar".
   - Botões "Descartar" e "Compartilhar".
   - "Compartilhar" também aparece no passo 5, para quem não quer revisar.
- Sair com dados preenchidos dispara o aviso "sair do site?".

**Cupom:** os mesmos 6 passos, com estas diferenças:
- Passo 1 pede **código + link** (ou "não tenho código nem link").
- Essenciais pede título e **tipo de desconto obrigatório**: % (abre campo de %), R$, frete grátis ou outro. Também pede disponibilidade.
- Imagens: **identifica a loja pelo link e usa o logo dela como imagem padrão**, com a opção "ignorar e subir imagens".

**O que entra no promo-br (decisões nossas):**
- Assistente em passos, com a mesma ordem.
- Checagem de duplicata pelo link.
- Leitura de título, imagem e preço pelo link.
  - Usar só og:/JSON-LD públicos da página.
  - Ou a API oficial da loja, quando houver integração.
- % ao vivo.
- Online/loja física.
- Cupom com tipo de desconto.
- Logo da loja como imagem padrão.
- Rascunho automático.
- Categoria obrigatória.
- Revisão antes de enviar.
- Níveis de reputação que liberam recursos.

## 5. Componentes

Público: DealCard (normal, destaque, patrocinado, expirado) · PriceBlock · PriceHistoryChart · TemperatureVote ·
CouponReveal · AffiliateButton · StoreBadge · Tabs · FilterBar · AdSlot (altura reservada, sem CLS) · ChannelCTA ·
Countdown · CookieBanner · AlertForm · CommentThread.
Painel: DataTable com ações em lote · SecretField (mostra só os 4 últimos dígitos) · TestConnectionButton ·
CronPicker · RuleBuilder (filtros do robô) · MessageTemplateEditor com preview · RunLog · KPI cards + gráficos.

## 6. Modelo de dados (inferido; conf. alta salvo indicação)

```
Store          id, name, slug, domain, logo, link_mode (direct_program|network|monetizer|direct),
               affiliate_template, network_id?, strip_params[], active
AffiliateNetwork id, name, deeplink_template, credentials -> Integration
Category       id, name, slug, parent_id, sort
Deal           id, slug, title, description, url_original, url_affiliate, code (redirect), store_id, category_id,
               price, price_before, discount_pct, coupon_code, image_url, product_key,
               status (pending|published|expired|rejected), source (robot|admin|user), source_ref,
               score, temperature, verified, is_sponsored, published_at, expires_at
Product        id, ean?, brand, model, variant, normalized_title, category_id       (palpite: unidade de comparação)
Listing        id, product_id, store_id, url, external_id, match_confidence, last_price, in_stock, checked_at
PriceSnapshot  listing_id, price, in_stock, captured_at                           (base do histórico)
Verification   deal_id, reference_price, real_discount, stores_compared, history_days, verdict
               (verified|good_price|no_comparison|inflated), evidence json, checked_at
Report         deal_id, user_or_ip_hash, kind (worked|price_changed|coupon_failed|out_of_stock), created_at
RankingConfig  weights json, gravity, thresholds json (no SiteSetting)
Coupon         id, store_id, code, description, expires_at, verified_at
Click          id, deal_id, channel (site|telegram|whatsapp|instagram), sub_id, ip_hash, ua, created_at
Conversion     id, network, order_ref, sub_id, deal_id?, amount, commission, status, occurred_at
Integration    key (shopee|amazon|ml|awin|lomadee|telegram|uazapi|ai|adsense), config_encrypted (AES-GCM), status, last_test_at
RobotRule      id, source, active, cron, categories[], keywords[], min_discount, min_commission, max_price, per_run, auto_publish
Channel        id, type (telegram|whatsapp), target, active, cron/window, max_per_hour, template, link_mode (site|direct)
Dispatch       id, deal_id, channel_id, status, sent_at, error
JobRun         id, job (robot|dispatch|sync|expire), started_at, finished_at, status, stats json, error
SiteSetting    key, value json (marca, SEO, anúncios, textos)       -> tabela única, sem multi-tenant
User / Vote / Comment / Alert  (pós-BF)
```

## 7. Mecanismo das ofertas (dentro do app)

1. **Robô (volume):** a Shopee é a única fonte 100% automatizável no dia 1 (busca + comissão + link com subId numa API oficial).
   Redes de afiliados entram por feed (XML/CSV/API) para cobrir Magalu, Casas Bahia, KaBuM etc.
   Amazon: link com `tag` manual até a conta liberar a Creators API; depois vira fonte no robô.
2. **Curadoria (qualidade):** você usa a A03 para colar links de ML/Amazon/qualquer loja; o app aplica o afiliado configurado na A05. De 20 a 50 por dia.
3. **Comunidade (escala, pós-BF):** S06 + votos.
4. **Verificado:** só ganha o selo quem tem preço atual ≤ menor preço dos últimos N dias (configurável). A loja define o "antes", nós mostramos o histórico.

Não fazer: scraping de lojas contra os termos, link de ML por sessão do navegador, copiar ofertas de Pelando/Promobit.

### Comunidade publica: regras do jogo

**Afiliado do usuário: política configurável no painel (por loja ou global)**

| política | o que acontece | quando usar |
| --- | --- | --- |
| **Manter o do usuário** (recomendado no lançamento) | o link de afiliado do autor vai para o ar | é o incentivo que traz "caçadores" de grupos de Telegram/WhatsApp para postar aqui |
| Dividir | o `/ir/` alterna entre o link do autor e o do dono numa proporção (ex.: 70/30) | quando o site já tiver tráfego próprio |
| Trocar pelo do dono | remove a tag do autor e aplica a nossa | lojas em que o dono tem programa e o autor não tem reputação |
| Por reputação | iniciante → dono; reputação ≥ X → mantém o do autor | equilíbrio a médio prazo |

A página marca discretamente "link de afiliado do autor" (transparência). O aviso na S13 explica as duas situações.

**Antispam (afiliado atrai spam, e o filtro é a verificação de preço):**
- Novos usuários: posts vão para a fila; depois de N posts aprovados, publicação direta.
- Limite de posts/dia por usuário, captcha (Turnstile) no cadastro e na publicação, e-mail verificado.
- Link aceito só de domínio de loja conhecido ou aprovado; encurtadores são expandidos até o destino final; lista de domínios bloqueados.
- **A verificação de preço vale para todo post**: "Desconto inflado" não publica, seja do usuário ou do robô. Quem posta inflado várias vezes perde reputação ou é banido.
- Duplicata: mesmo produto/loja/preço já ativo → sugere comentar ou votar na oferta existente.
- Denúncias da comunidade derrubam o post para a fila.

**Reputação:** pontos por oferta aprovada, temperatura recebida e "funcionou"; perde com inflado/expirado/denúncia procedente.
Placar mensal de caçadores (S09), que é o principal motivo para postar além da comissão.

**Começo sem usuários (cold start):** o dono + robô publicam como conta "Equipe promo-br" para o site nunca estar vazio;
convidar caçadores de grupos de promoção com a proposta "poste aqui e mantenha sua comissão".

### Links de afiliado: com ou sem

Decisão do dono: **toda oferta boa entra no site, com ou sem link de afiliado.** O afiliado é um bônus por loja, não um requisito.

Cada loja (A05) tem um **modo de link**, e o app tenta na ordem da corrente abaixo, usando o primeiro modo disponível:

| ordem | modo | como funciona | cadastro |
| --- | --- | --- | --- |
| 1 | Programa direto | modelo da loja: Amazon `?tag=`, Shopee `generateShortLink` (API), ML pelo link gerado no painel deles | um por loja |
| 2 | Rede de afiliados | modelo de *deeplink* da rede (Awin, Lomadee, Rakuten, Admitad, Afilio…): uma conta, várias lojas; cada loja aprova separadamente | um por rede + aprovação por loja |
| 3 | Monetizador automático | serviço que converte qualquer link de loja parceira (tipo Skimlinks/Sovrn): cobertura no Brasil a confirmar | um só |
| 4 | **Link direto** | URL limpa da loja, sem comissão | nenhum |

Regras:
- **Link postado por usuário não é alterado** (decisão do dono, 20/10): a tag de afiliado do autor é preservada. É o incentivo para a comunidade postar aqui.
  O sistema só **lê** o link: expande encurtador para conferir o domínio de destino e checar malware, mas redireciona para o link original do autor.
- A corrente de modos abaixo vale **só para ofertas do dono/robô** (e para a política opcional "dividir/trocar", desligada por padrão).
- Loja desconhecida (domínio novo): cadastro automático da loja em modo **direto**, sem bloquear a publicação.
- Todo clique passa pelo nosso `/ir/[codigo]` em qualquer modo, inclusive o direto, para medir.
- Relatório no painel: **"cliques sem comissão por loja"**, que mostra em qual programa vale a pena se cadastrar primeiro.
- Oferta sem afiliado continua rendendo pelo **anúncio da página** (S02) e pelo tráfego que ela traz para o site.
- O ranking **não** favorece oferta com comissão (confiança do visitante). Pode existir um peso opcional no painel, desligado por padrão.
- Aviso de comissão na S13 cobre os dois casos ("alguns links nos pagam comissão").

### Verificação: a promoção é real e está funcionando?

Decisão do dono: qualquer nicho, ranking puxado pelo desconto, e **nenhum alerta falso**.
O "de R$ X" que a loja mostra **não entra no cálculo**. O desconto do site é sempre o **desconto real** contra um preço de referência que nós medimos.

**1. Identificar o produto (para achar o mesmo item em outras lojas)**
- Primeiro pelo **EAN/GTIN** quando a fonte informa (código de barras é igual em todas as lojas).
- Sem EAN: marca + modelo extraídos do título (ex.: "Galaxy A56 128GB") + IA para confirmar se é o mesmo produto (cor/capacidade/voltagem contam).
- Resultado guardado em `Product` com um `match_confidence`. Abaixo do limite configurado, a comparação não vale e o selo não aparece.

**2. Preço de referência, de três fontes (pesos configuráveis no painel)**

| fonte | como | vale desde |
| --- | --- | --- |
| Histórico próprio | o robô grava o preço do item todo dia → mediana e mínimo de 30/90 dias | ~2 semanas de coleta |
| Outras lojas agora | busca o mesmo produto nas fontes conectadas: Shopee API, Amazon (Creators API), feeds de redes (Magalu, Casas Bahia, KaBuM etc.), busca do Mercado Livre se a API permitir | dia 1 (cobertura depende das integrações) |
| Comunidade | botões "funcionou" / "preço mudou" / "cupom não funciona" | quando houver público |

`preço_referência` = mediana dos preços de outras lojas e do histórico (ignorando outliers).
`desconto_real` = 1 − preço_atual / preço_referência.

**3. Selo na página (com o porquê visível ao visitante)**

| selo | regra padrão (editável) | o que acontece |
| --- | --- | --- |
| Desconto verificado | desconto_real ≥ 15% e preço ≤ menor preço de 30 dias e comparado com ≥ 2 lojas | publica, sobe no ranking |
| Bom preço | é o menor preço entre as lojas comparadas, mas o desconto real é pequeno | publica |
| Sem comparação | não achamos o produto em outra loja e não há histórico suficiente | vai para a fila, você decide |
| Desconto inflado | o "de" da loja é ≥ 20% maior que a referência e o desconto real é < 5% | **não publica** (fica registrado em A12) |

A página da oferta mostra: "R$ 1.299 na Amazon · R$ 1.459 no Magalu · R$ 1.520 na Shopee · menor preço em 30 dias". É prova, não promessa.

**4. Continua funcionando? (revalidação)**
- Antes de publicar e antes de cada envio para canal: consulta o preço e a disponibilidade de novo.
- Depois de publicada: rechecagem a cada N horas (mais frequente nas primeiras 24h e na semana da BF).
- Subiu o preço, esgotou ou o cupom falhou → muda para **Expirada** automaticamente; o redirect leva para "acabou + similares".
- 3 ou mais "não funcionou" em pouco tempo → volta para a fila até alguém conferir.
- Lojas sem API (ML/Amazon antes da liberação): a oferta manual pede prazo de validade e entra com rechecagem por denúncia + validade; não há leitura automática da página da loja.

**Limites honestos:** a comparação só cobre lojas que temos por API/feed; produtos sem EAN podem não casar (aí o selo não aparece, não um selo errado);
em 27/11 o histórico próprio terá ~4 semanas, então ligar o robô **o quanto antes** importa mais do que qualquer tela.

### Ranking (o que aparece primeiro)

Abas, todas com só ofertas ativas:
- **Maiores descontos:** ordena por `desconto_real` (só Verificado/Bom preço). É o pedido principal.
- **Mais quentes (padrão da home):** mistura desconto, uso e frescor:

```
quente = (w1·desconto_real + w2·log(1+cliques_24h) + w3·log(1+conversões) + w4·votos_liquidos + w5·verificado)
         / (horas_desde_publicação + 2)^gravidade
```
  Pesos e gravidade editáveis no painel. "Mais usadas" entra pelos cliques e pelas vendas confirmadas (subId), não só por votos.
- **Novas:** cronológica.
- **Por categoria/loja:** mesmas regras dentro do filtro.

Proteções: clique repetido do mesmo IP/aparelho conta uma vez; tráfego de bot é ignorado; destaque patrocinado aparece marcado e não mexe no ranking orgânico.

### Como roda sem n8n
- Um processo **worker** na mesma imagem (como o `JOBS_ATIVOS` da Big Assessoria), 1 réplica, com agendador interno que lê os crons do banco a cada minuto.
- Trava por job no Postgres (advisory lock) para nunca rodar duas vezes; cada rodada vira um `JobRun` visível na A12.
- Fila simples em tabela (Dispatch) com retry e limite por hora para não ser bloqueado no WhatsApp/Telegram.

## 8. Monetização

**Ordem atualizada:** publicidade é a receita principal; comissão própria e patrocinados complementam.

| fonte | quando | observação |
| --- | --- | --- |
| **Display (AdSense no começo; rede premium com mais tráfego)** | pedir no início de nov. | receita principal; slots no feed, página da oferta, lateral; reservar altura (sem CLS) |
| **Destaques patrocinados / banner de loja** | quando houver audiência | venda direta para lojas na BF; marcado "Patrocinado" |
| **Impulsionar oferta** | após a BF | o caçador paga (Pix) para fixar o post no topo da categoria por X horas; marcado "Impulsionado"; só ofertas verificadas |
| Comissão de afiliado do dono | dia 1 | posts do dono/robô (+ política "dividir/trocar" opcional, desligada) |

Conta de bolso da publicidade: `receita ≈ páginas vistas ÷ 1000 × RPM`. O RPM (receita por mil páginas) no Brasil costuma ser baixo
e varia muito por nicho e época (sobe em nov./dez.); medir o nosso no primeiro mês antes de projetar.
Por isso o produto otimiza **páginas por visita**: feed infinito, ofertas relacionadas, páginas de loja/categoria e perfil, todas com anúncio.
| Canais WhatsApp/Telegram | dia 1 | volume da BF; opt-in, sem spam em grupos alheios |
| Display (AdSense) | pedir assim que houver conteúdo + páginas legais (início de nov.) | aprovação leva tempo; slots configurados na A09 |
| Destaque patrocinado | depois de ter audiência | marcar "Patrocinado" |
| Alertas/newsletter | pós-BF | retenção |

Obrigatório: aviso de comissão, privacidade, banner de cookies (LGPD) e `ads.txt` antes dos anúncios.

## 9. O que não se clona

Marca/layout/textos do Promodescuentos (`skip`) · a comunidade deles (`skip`) · acordos diretos com lojas (`skip` no início) ·
histórico de preço antigo (`skip`, o nosso começa no dia em que o robô ligar).

## 10. Tamanho e cronograma

26 telas (13 públicas + 13 do painel), 7 fluxos, ~16 entidades.
Partes difíceis: (1) **painel de integrações + worker interno** (credenciais criptografadas, agendador, travas, retries),
(2) integração Shopee (assinatura, paginação, limites) + envio WhatsApp/Telegram sem bloqueio, (3) performance com anúncios + SEO.

**Tamanho: M.** Para a BF entra um recorte; o resto vem em dezembro.

| semana | entregas |
| --- | --- |
| 20–26/10 | marca + domínio + nicho; **pedir já** Shopee Open API, Amazon Associados, ML afiliados, 1 ou 2 redes (aprovação demora); criar canais Telegram/WhatsApp/Instagram; repo + Supabase + stack no Portainer |
| 27/10–02/11 | S01, S02, S04, S05, S12, S13; **cadastro/login de usuário (S08), publicar oferta (S06), votos, comentários**; painel A02–A05, A10, A11 |
| 03–09/11 | perfil/reputação (S09), denúncias, antispam e moderação; A06 integrações, robô Shopee + PriceSnapshot + verificação; S11 hub BF; **pedir AdSense** |
| 10–16/11 | A09 anúncios, A08 envio Telegram/WhatsApp, A01 métricas; convidar caçadores; "esquenta Black" |
| 17–30/11 | modo campanha até a Cyber Monday (30/11); moderação ativa; só correções |
| dez | feeds de redes, Amazon automática, política "dividir" de afiliado, alertas, venda de patrocinados |

**Revisão de tamanho:** com a comunidade dentro do escopo da BF, o projeto fica entre **M e L**. O prazo é apertado; o que cortar se atrasar:
alertas, placar de caçadores, envio para WhatsApp (manter Telegram), robô de outras fontes além da Shopee.

Stack: Next.js 16 + React 19 + Supabase (Postgres, Auth, Storage) + worker Node na mesma imagem; GitHub Actions → `ghcr.io/vozzyup/<nome>`;
Portainer Swarm + Traefik (mesmo padrão de `Clientes/Big Assessoria/site/docker-compose.yml`).

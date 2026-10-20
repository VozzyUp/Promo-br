# promo-br: componentes

Estrutura e comportamento seguem o layout de referência (prints em `replica/screens/`).
Identidade é própria: cores de `tokens.json`, fonte Figtree, ícones **Lucide** (MIT), textos novos em pt-BR, logo próprio.
Base acessível: Radix Primitives (Dialog, DropdownMenu, Tabs, Tooltip, Toast) por baixo dos componentes.

## Moldura da página

```
AppHeader (sticky)
  linha 1 · 56px   Logo | [Menu] | [Busca........] | Criar alerta | Entrar ou cadastrar | (+ Publicar)
  linha 2 · 46px   Categorias ▾ | Cupons ▾ | Grátis ▾ | Ofertas | Discussões | ...   (rolagem horizontal no celular)
  states    topo (fundo transparente), rolado (fundo bg + sombra fina), celular (linha 1: logo, ícone de busca, avatar, +)
  tokens    bg bg, texto text, borda border; Publicar = Button secondary pill
  a11y      <header>, nav com aria-label, busca com <label> oculto, link "Pular para o conteúdo"
  used on   todas

PageHero         H1 display + subtítulo text-muted (só na home e no hub BF; some no celular abaixo de md)
FeedTabs         Pra você | Mais quentes | Maiores descontos | Novas — sublinhado accent 2px na ativa; Radix Tabs; rolável no celular
Layout           max 1024; main 732 + aside 250, gutter 16; abaixo de lg o aside vai para baixo do feed ou some
Footer           links legais, aviso de comissão, redes; bg bg
BackToTop        pílula "Subir" fixa no canto inferior direito após 2 telas de rolagem
```

## Componentes

```
DealCard  (feed)
  layout    [imagem 198×198 em faixa surface, radius xs] | [conteúdo]
            conteúdo: linha 1 TemperatureVote ........ TimeChip
                      linha 2 título (title 18/26 bold, 2 linhas máx.)
                      linha 3 PriceBlock + "Disponível em <Loja>" + avatar "Postado por <usuário>"
                      linha 4 descrição (sm, muted, 3 linhas máx.)
                      linha 5 ActionBar ............................ DealCTA ou CouponCTA
  variants  oferta, cupom (sem preço; mostra % ou valor + CouponCTA), patrocinado (selo "Patrocinado"), impulsionado (selo)
  states    default, hover (shadow card-hover, título accent), expirada (opacidade 60%, selo "Acabou", CTA desabilitado),
            carregando (skeleton com as mesmas medidas), com VerifyBadge ao lado do preço
  tokens    bg bg, radius card (8), shadow card, padding 16
  mobile    imagem 96×96 em cima à esquerda, título ao lado; CTA ocupa a largura toda
  a11y      <article> com aria-labelledby no título; o título é o link para a página; o CTA é um link separado com texto completo
  used on   S01, S03, S04, S10, S11

TemperatureVote
  layout    pílula com borda: [↓ frio] 515° [↑ quente]
  states    neutro; votou quente (seta hot preenchida); votou frio (seta cold preenchida); sem login (abre LoginDialog);
            temperatura ≥ 100 em hot; ≤ 0 em cold; carregando (desabilitado)
  tokens    borda border, radius pill, número 16/24 bold
  a11y      dois <button> com aria-pressed e aria-label "Votar quente" / "Votar frio"; número em aria-live polite
  used on   S01, S02

PriceBlock
  layout    preço (price 24/32 bold, cor price) · "de" riscado (sm, muted) · DiscountChip (-65%)
  regra     o % mostrado é o desconto REAL (verificação); o "de" da loja só aparece riscado se não foi marcado como inflado
  a11y      preço anterior em <s> + texto oculto "preço anterior"
  used on   DealCard, S02, HotSidebar

DiscountChip   fundo price-soft, texto price, radius xs, 14/20 bold
VerifyBadge    variants verificado (ícone shield-check, price), bom preço (tag, info), sem comparação (help-circle, muted);
               Tooltip explica o motivo; clique leva à seção "Histórico de preço" da S02
TimeChip       "Publicado há 2 h" — fundo surface, radius sm, sm muted; <time datetime> com a data completa no title

DealCTA
  variants  "Ir para a oferta ↗" (pílula cheia accent)
  sizes     md 40 (card), lg 56 (página)
  states    default, hover (accent-hover), focus-visible, desabilitado (expirada), carregando
  a11y      <a> com rel="sponsored noopener" e target _blank anunciado ("abre em nova aba")

CouponCTA  (padrão "botão + aba do código")
  layout    pílula accent "Pegar cupom e ir à loja" e, à direita, uma aba clara mostrando o fim do código (…15)
  comport.  clique: copia o código, mostra toast "Código copiado", abre a loja em nova aba (via /ir/)
            o código completo também fica visível em CouponCode na página
  states    default, hover (a aba desliza 8px revelando mais do código), copiado (ícone check), expirado
  a11y      um único <button>; aria-label "Copiar o código e abrir a loja"; se a área de transferência for negada, seleciona o texto

CouponCode     caixa tracejada com o código em mono + botão Copiar (página de cupom e S05)
ExpiryBanner   faixa info-soft, ícone clock, "Este cupom vence sábado às 02:59"; variante danger quando falta < 24 h
VotePrompt     cartão com pergunta própria ("Vale a pena? Vote para ajudar outros caçadores") + [Frio] [Quente] (outline pill)
AuthorBlock    avatar, "Postado por <usuário>", selo de papel (Moderador / Caçador destaque), "Membro desde", nº de ofertas e comentários
DisclosureNote xs muted itálico: "Alguns links nos pagam comissão quando você compra. Isso não muda o que aparece aqui."
StoreLink      logo da loja (enviado no painel) + "Ver na <Loja> ↗"
ActionBar      [comentários n] [Compartilhar] [Salvar] — ícones Lucide, botões ghost 36px
ImageGallery   imagem principal (radius lg) + botão "Ampliar" (abre Dialog); placeholder quando não há imagem

HotSidebar
  layout    cartão "Mais quentes" com fechar (×) + 3 a 5 MiniDealCard (imagem 100×100 com temperatura no canto e %,
            título 3 linhas, preço) + link "Ver mais →"
  states    fechado (lembra no localStorage), carregando, vazio (some)
  used on   S01, S03, S04

AdSlot
  layout    rótulo "Publicidade" (xs muted) + "Denunciar" à direita; área com altura mínima reservada (min_height_px do painel)
  states    carregando (fundo surface), preenchido, vazio (mantém a altura; colapsa só após timeout), sem consentimento (não carrega)
  regra     no feed, a cada N cards (painel); nunca entre o título e o CTA de uma oferta
  a11y      <aside aria-label="Publicidade">
  used on   S01, S02, S03, S04, S10

Breadcrumb     Início › Categoria (sm muted) — também em JSON-LD
Button         primary (accent), secondary (outline accent, pill), ghost, danger; sm 32, md 40, lg 48/56; loading mantém o rótulo
IconButton     36×36, ghost, aria-label obrigatório
Input/Textarea/Select   altura 44, borda border-input, radius sm, label sempre visível, erro em danger abaixo, ajuda em muted
PriceInput     prefixo "R$", máscara BR (1.299,90), guarda centavos
LinkInput      cola o link → mostra loja detectada, destino final e "seu link de afiliado será mantido" (S06)
ImageUpload    arrastar, colar ou selecionar; preview; máx. 5 MB; erro legível
Tabs, Dropdown, Dialog, Tooltip, Toast   Radix; Dialog com foco preso e Esc; Toast em aria-live
LoginDialog    e-mail + senha, "Entrar com Google", link de cadastro; aparece ao votar, comentar ou publicar sem login
EmptyState     ícone Lucide + frase própria + ação (ex.: "Nada por aqui ainda. Que tal publicar a primeira oferta?")
Skeleton       mesmas medidas do componente real (evita CLS)
CommentThread  1 nível de resposta; ordenar por mais curtidos / mais novos; denunciar; editar por 5 min
Countdown      hub BF: dias, horas, minutos com tabular-nums
ChannelCTA     "Receba as ofertas no Telegram / WhatsApp" com ícones simples
CookieBanner   rodapé fixo: Aceitar, Recusar, Preferências; AdSense só carrega após aceitar
```

## Painel (`/painel`)

```
AdminShell     sidebar 240 (Visão geral, Fila, Ofertas, Cupons, Lojas, Usuários, Integrações, Robô, Canais, Anúncios, Aparência, Páginas, Execuções)
DataTable      seleção em lote, filtros, paginação por cursor, ações por linha, estados vazio/carregando/erro
SecretField    mostra "••••abcd" e o botão Trocar; nunca devolve o segredo ao navegador
TestConnectionButton   testar → testando → ok (success) / erro (danger com mensagem legível)
CronPicker     presets (3x por dia, de hora em hora...) + avançado; mostra "próxima execução: hoje 13:00"
RuleBuilder    campos do robô (categorias, palavras, % mín., comissão mín., preço máx., por rodada, publicar direto)
TemplateEditor variáveis {titulo} {preco} {desconto} {link} + preview ao vivo
RunLog         execuções com status, duração, contagens e erro expansível; botão "Rodar agora"
KpiCard        número + variação + gráfico de linha (cliques, conversões, comissão, RPM estimado)
```

## Mapa telas × componentes

| tela | componentes principais |
| --- | --- |
| S01 Home | AppHeader, PageHero, FeedTabs, DealCard, AdSlot, HotSidebar, BackToTop |
| S02 Oferta/Cupom | Breadcrumb, ExpiryBanner, ImageGallery, TemperatureVote, ActionBar, TimeChip, PriceBlock, VerifyBadge, DealCTA ou CouponCTA, CouponCode, VotePrompt, AuthorBlock, StoreLink, DisclosureNote, gráfico de histórico de preço, CommentThread, AdSlot |
| S03/S04 Categoria/Loja | cabeçalho da categoria/loja, FeedTabs, DealCard, CouponCode, AdSlot, HotSidebar |
| S05 Cupons | DealCard (variante cupom), CouponCTA |
| S06 Publicar | LinkInput, PriceInput, ImageUpload, Select, Textarea, Button |
| S08 Entrar | formulário do LoginDialog em página, Input |
| S09 Perfil | AuthorBlock grande, abas (ofertas, comentários), DealCard |
| S11 Black Friday | PageHero, Countdown, FeedTabs, DealCard, ChannelCTA |

Primitivos em código: construídos isolados numa rota `/design` no primeiro passo do `/replica-build` (o projeto Next ainda não existe).

# Plano de testes

Suíte: `npm test` (Vitest, unidade) e `npm run test:e2e` (Playwright, contra o site de produção local na porta 3100; rode `npm run build` antes). Contas de teste vêm de `.env.local` (`SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD`).

## Automatizados

| Área | Casos | Onde |
| --- | --- | --- |
| Páginas públicas | 18 rotas: abre, sem 5xx, sem erro de console, sem falha grave de acessibilidade (axe WCAG A/AA) | `e2e/public.spec.ts` F-PUB |
| Oferta | página abre com ação principal; busca com vazio, aspas e `<script>` não quebra nem reflete HTML; 404; sem rolagem horizontal no celular | idem |
| Segurança | cabeçalhos (CSP, nosniff, frame, referrer); 13 rotas protegidas mandam anônimo ao login; `/ir/` 302 com no-store e noindex; código inexistente volta à home; robots, ads.txt, sitemap, health; senha errada com mensagem genérica; recuperação de senha com a mesma resposta | `e2e/security.spec.ts` |
| Cookies | aviso aparece, recusar lembra a escolha e não carrega anúncio, aceitar grava, rodapé reabre, nada de anúncio sem escolha | `e2e/consent.spec.ts` |
| Painel | 13 telas carregam para admin, sem erro e acessíveis; usuário comum não entra; texto legal renderiza com seções e listas | `e2e/admin.spec.ts` |
| Gravação | discussão: criar, comentar, remover; cupom: assistente completo com imagem, fica pendente, galeria aparece, link repetido com outro rastreador é recusado; arquivo falso é recusado pelos bytes e o erro aparece | `e2e/flows.spec.ts` |
| Lógica | links, texto rico, menções, medalhas, imagens, chave de duplicata, rede segura, leitura de página, preço e selos, cron, criptografia, regras do robô, leitura da Shopee, mensagens e regras dos canais, texto das páginas, hierarquia da equipe | `tests/*.test.ts` |

## Casos de borda cobertos
Entrada vazia, aspas e HTML na busca, duplo envio (limite diário), link repetido com rastreador diferente, domínio bloqueado, arquivo que finge ser imagem, sessão ausente em todas as rotas protegidas, papel insuficiente, celular 390 px.

## Manual (depende de terceiros ou de você)
- E-mail de confirmação e de recuperação chegando (SMTP próprio).
- Envio real para Telegram e WhatsApp, API real da Shopee, anúncios reais do AdSense.
- Imagem Docker e workflow do GitHub Actions no primeiro push.
- Pagamento: não existe nesta fase (impulsionar oferta fica para depois da Black Friday).

## Ainda sem teste automático
Fila em lote e edição de ofertas no painel (gravam dados que não dá para apagar pelo conector), edição de lojas, faixa da Black Friday, páginas legais editadas, execução do robô e do envio (precisam das credenciais).
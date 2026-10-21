# Pendências do Fernando (só ele pode fazer)

Atualizado em 21/10/2026. Lançamento: Black Friday, 27/11/2026.

## Subir o site
- [ ] Criar o repositório no GitHub e autorizar o push (hoje só há commits locais).
- [ ] Definir o domínio.
- [ ] GitHub > Settings > Secrets and variables > Actions > Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (e, se quiser, `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT`).
- [ ] Portainer: criar a stack com `deploy/stack.yml` e definir `IMAGE`, `DOMAIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `HASH_SALT`, `MASTER_KEY` (`openssl rand -hex 32`) e `WORKER_ENABLED=1`.
- [ ] Conferir se `traefik_public` e `letsencrypt` batem com a Traefik; senão definir `TRAEFIK_NETWORK` e `TRAEFIK_RESOLVER`.
- [ ] Se o pacote do ghcr for privado, fazer login do Swarm no ghcr.

## Ganhar dinheiro
- [ ] Conta do AdSense: pedir aprovação (precisa de conteúdo e páginas legais no ar) e informar ID do editor e do bloco em Painel > Anúncios.
- [ ] Credenciais da Shopee Afiliados em Painel > Integrações + "testar conexão".
- [ ] Cadastros de afiliado nas outras lojas (Amazon, Mercado Livre etc.).

## Distribuir
- [ ] Bot do Telegram (@BotFather) e canal; instância UAZAPI e grupo de WhatsApp. Depois criar os canais em Painel > Canais.

## Supabase
- [ ] Redirect URLs e templates de e-mail do Auth.
- [ ] SMTP próprio (o e-mail padrão tem limite baixo e atrapalha cadastros no lançamento).
- [ ] Avaliar plano Pro e backup antes do lançamento.
- [ ] Reativar o projeto da Big Assessoria quando houver vaga ou Pro.
- [ ] Rodar no SQL Editor todo SQL de criar/alterar/apagar que o Claude entregar no chat.

## Jurídico e conteúdo
- [ ] Revisão jurídica de privacidade, termos, conduta e sobre (editáveis em Painel > Páginas). Falta canal de contato e lista de cookies e parceiros de anúncio.
- [ ] Revisar a política de link de afiliado de cada loja em Painel > Lojas.

## Segurança e dados
- [ ] Rodar `supabase/cleanup-testes.sql` no SQL Editor (primeiro os selects de conferência) para apagar ofertas, vendas, regras, canais, integrações e domínios criados pelos testes.
- [ ] Guardar uma cópia da `MASTER_KEY` fora do servidor. Se ela se perder, as credenciais salvas no painel ficam ilegíveis.
- [ ] Ligar a proteção contra senha vazada no Supabase Auth (exige plano Pro).
- [ ] Considerar Turnstile (Cloudflare) no login e no cadastro, se aparecer abuso.
- [ ] Depois que o AdSense for aprovado, conferir se os anúncios aparecem com a política de segurança (CSP). Se algo for bloqueado, definir `CSP_REPORT_ONLY=1` e me avisar.

## Limpeza local
- [ ] Fechar o servidor de teste da porta 3100 quando terminar.

## Funcionalidades novas (21/10/2026): o que falta de você para ligar

- [x] **Rodar a migração 7** (feito em 21/10/2026) no SQL Editor do Supabase: `supabase/migrations/20261021000007_ranking_newsletter_oauth.sql`. Ela liga os pesos do ranking (Painel > Ranking), cria a lista do boletim e deixa o login com Google criar o perfil sozinho. É segura para rodar mais de uma vez.
- [ ] **Boletim por e-mail**: em Painel > Integrações > "E-mail (SMTP)", preencha servidor, porta, usuário, senha e remetente e clique em salvar e testar. O formulário no rodapé só aparece quando isso e a migração estiverem prontos. Envio toda segunda às 9h (Brasília).
- [ ] **Depois da migração e do SMTP**, rodar `npx playwright test e2e/integration/ai-smtp.spec.ts --project=integration`: o teste I-3 hoje pula a parte da inscrição porque a tabela ainda não existe.
- [ ] **IA para textos**: em Painel > Integrações > "IA para textos (Claude)", cole a chave da API da Anthropic e o modelo (ex.: claude-haiku-5-5). O botão aparece no assistente de publicar.
- [ ] **Login com Google**: criar o cliente OAuth no Google Cloud, ativar o provedor Google no Supabase (Authentication > Sign In / Providers), colocar o endereço do site em Redirect URLs e trocar `GOOGLE_LOGIN` para `"1"` na stack.
- [ ] **Impulsionar pelo usuário (Pix)**: hoje só a equipe destaca (6 a 72 h). Vender destaque precisa de um provedor de pagamento (Pix) e do contrato; é decisão de negócio.
- [ ] Rodar `supabase/cleanup-testes.sql` de novo: ganhou a linha que apaga o produto do teste de comparação por código de barras. Rode **depois da migração 8** (a última linha apaga as fontes de teste) e **antes** de preencher SMTP e IA de verdade (ele zera as integrações; a conta do Telegram fica).

## Fontes do Telegram (21/10/2026): ofertas de canais e grupos, sem afiliado

O robô lê canais e grupos, segue o link de cada oferta até a loja, tira o código de afiliado de quem publicou e manda para a fila de aprovação.

- [ ] **Rodar a migração 8** no SQL Editor: `supabase/migrations/20261021000008_sources.sql` (cria as fontes e o registro do que foi lido; libera a conta do Telegram na tabela de integrações). Pode rodar de novo sem problema.
- [ ] Depois da migração, rodar (ou pedir ao Claude) `npx playwright test e2e/integration/sources.spec.ts --project=integration`: o teste F-1 pula enquanto a tabela não existe.
- [ ] **Canais públicos** (têm @nome e abrem em t.me/s/nome): em Painel > Fontes > Nova fonte, tipo "Canal público", cole o @nome. Começa a cada 10 min, indo para a fila. Aprove em Painel > Fila de ofertas.
- [ ] **Grupos privados ou canais sem página pública** (opcional): crie o api_id e o api_hash em my.telegram.org > API development tools; em Painel > Fontes > Conta do Telegram, informe os dois e o telefone, digite o código que chega no app do Telegram (e a senha de duas etapas, se tiver). Prefira um número separado do pessoal. A conta só lê.
- [ ] Decidir com o tempo: publicar direto (sem fila) nos canais que se mostrarem confiáveis; ajustar desconto mínimo, preço máximo e palavras bloqueadas por fonte.
- Riscos a ter em mente: as ofertas foram garimpadas por outros canais (use como reforço, não como única fonte); oferta relâmpago pode já ter acabado; Magalu e Casas Bahia bloqueiam a leitura da página (o robô usa o texto da publicação nesses casos); um canal pode mudar o formato e o robô passar a marcar "sem link da loja" (aparece em Painel > Fontes > Últimas publicações lidas).

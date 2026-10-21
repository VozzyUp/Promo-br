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

## Limpeza local
- [ ] Fechar o servidor de teste da porta 3100 quando terminar.
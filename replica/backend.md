# Backend: promo-br

## Supabase

- **Projeto:** `promo-br` (ref `tbrdcdgyhhhajqphpcit`), região sa-east-1 (São Paulo), organização VozzyUP, plano gratuito. Criado em 20/10/2026.
  - Para caber no limite de 2 projetos gratuitos, o projeto Big Assessoria foi **pausado** a pedido do dono. Os dados ficam preservados; reativar pelo painel do Supabase.
- **Migrations** em `supabase/migrations/`, já aplicadas:
  - `20261020000001_init.sql`: 27 tabelas, RLS e contadores.
  - `20261020000002_app.sql`: perfil no cadastro, `deals_ranked` e as funções `vote_toggle`, `record_click` e `moderate_deal`. Também cria o bucket `deal-images` e insere as lojas e categorias.
- **Seed:** `npm run db:seed` (`scripts/seed.mjs`, idempotente). Cria 3 usuários de teste (`equipe`, `admin`, `cacadora`) e 6 ofertas inventadas. Precisa de `SUPABASE_SECRET_KEY` e `SEED_ADMIN_PASSWORD`.

## Como o app escolhe a camada

`lib/supabase/server.ts → supabaseEnabled()` exige a URL, a chave publicável **e** a chave secreta.

- **Sem as três:** camada em memória com sessão HMAC. Serve para desenvolver sem banco.
- **Com as três:** Supabase. Nenhuma tela muda: `lib/data/index.ts` exporta as mesmas funções.

## Acesso (quem pode o quê)

- **Leitura e escrita pelo servidor:** o servidor lê e grava com a chave secreta (`supabaseAdmin()`), sempre depois da checagem de papel nas server actions (`requireUser`, `requireModerator`).
- **Navegador:** recebe só a chave publicável. Pelo RLS, só lê:
  - ofertas `published` e `expired`, mais as próprias;
  - lojas ativas e categorias;
  - perfis não banidos;
  - comentários visíveis;
  - os próprios votos, alertas e impulsos;
  - `site_settings` com chave `public.*`.
- **Tabelas operacionais** (cliques, conversões, integrações, jobs e outras): sem policy, ou seja, sem nenhum acesso pelo navegador.
- **Funções** `vote_toggle`, `record_click` e `moderate_deal`: `execute` revogado de `anon` e `authenticated`. Conferido em 20/10 com `has_function_privilege`.

## Auth (Supabase Auth)

- **Cadastro:** e-mail e senha, com `username` e `display_name` em `user_metadata`. O trigger `handle_new_user` cria o perfil.
  - A confirmação por e-mail é obrigatória (padrão do projeto).
  - E-mail já cadastrado recebe a mesma resposta, para não revelar quem tem conta.
- **Sessão:** cookies http-only geridos pelo `@supabase/ssr`. O `proxy.ts` renova o token a cada requisição. `getSession` valida o JWT com `getClaims`.
- **Login de banido:** recusado; a sessão é encerrada.
- **Saída:** `signOut("local")`. `signOut("global")` já existe para o "sair de todos os aparelhos" do perfil.
- **Recuperar senha:**
  1. `/recuperar-senha` envia o e-mail, com a mesma resposta exista a conta ou não.
  2. `/auth/confirm` abre a sessão.
  3. `/nova-senha` grava a senha nova.
- **Links de e-mail:** `/auth/confirm` aceita `token_hash` (funciona em outro aparelho) e `code` (PKCE, mesmo navegador). Destino só interno (`safeNext`).

## Pendências que dependem do dono (painel do Supabase)

- [ ] Colar a **Secret key** em `.env.local` (`SUPABASE_SECRET_KEY`): Project Settings > API Keys. Depois, rodar `npm run db:seed`.
- [ ] **Auth > URL Configuration:**
  - Site URL: o domínio final.
  - Redirect URLs: `http://localhost:3100/**` e `https://<dominio>/**`.
- [ ] **Auth > Email Templates** (Confirm signup e Reset password): trocar o link por `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (na recuperação, `type=recovery`). Assim o link funciona mesmo aberto em outro aparelho.
- [ ] **SMTP próprio** (Resend, com domínio verificado) antes do lançamento. O SMTP padrão do Supabase tem limite de poucos e-mails por hora.
- [ ] **Backups:** o plano gratuito não tem backup diário. Para a Black Friday, plano Pro (backup diário e sem pausa por inatividade).

## Checklist de segurança

- [x] Segredos só em variáveis de ambiente. `.env*` no `.gitignore` (exceto `.env.example`). Nada secreto no bundle do navegador.
- [x] Entrada validada no servidor (zod nas actions). IDs validados como UUID em voto e moderação.
- [x] Autorização em toda escrita: papel checado no código, RLS fechada para o navegador e funções sem `execute` público.
- [ ] Limite de tentativas: o Supabase Auth já limita login, cadastro e e-mail. **Falta limitar publicar, votar e `/ir/` por IP** (Turnstile e rate limit no proxy).
- [ ] Webhooks com assinatura: não há webhooks ainda (Pix só depois da BF).
- [x] Uploads: bucket com 2 MB e só jpeg, png e webp. Leitura pública, upload só pelo servidor. **Falta a tela de upload.**
- [x] Sem dado pessoal em URL ou log. O clique guarda hash diário, sem IP. Os erros de auth são logados só com código e mensagem.
- [ ] `npm audit`: rodar e revisar antes do deploy.
- [ ] Política de privacidade listando os operadores (Supabase, host da VPS, Google AdSense, Cloudflare, Resend).

## Testes

- `npm test` (vitest): redirecionamento seguro, link do autor intacto, recusa de esquemas e IPs internos, casamento de domínio de loja.
- **Teste de "um segundo usuário não vê nada":** a fazer com dados reais depois do seed, logado com 2 contas pelo navegador.

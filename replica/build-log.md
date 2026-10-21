# Build log: promo-br

Camada de dados: **Supabase** (`lib/data/supabase.ts`) quando `.env.local` tem URL, chave publicável e chave secreta. Sem elas, a camada em memória (`lib/data/memory.ts`).
Sessão: Supabase Auth (cookies do `@supabase/ssr` e `proxy.ts`). Sem Supabase, cookie HMAC de desenvolvimento. Detalhes em `replica/backend.md`.
Teste local: `npm run build && npx next start -p 3100`. Admin de teste: `admin@promo-br.test`, senha em `.env.local` (`DEV_ADMIN_PASSWORD`).

| ID | data | status | o que falta | mais difícil que o esperado |
| --- | --- | --- | --- | --- |
| shell | 2026-10-20 | done | — | Tailwind v4 usa `max-w-(--var)`, não `max-w-[--var]`; o layout inteiro quebrou até corrigir |
| /design | 2026-10-20 | done | screenshot da vitrine para o diff | — |
| S01 Home | 2026-10-20 | partial | aba "Pra você", scroll infinito, AdSense real | — |
| S02 Oferta/Cupom | 2026-10-20 | partial | comentários, histórico de preço, prova de preço, imagem | metadata precisava da sessão para o autor ver a própria oferta pendente |
| S06 Publicar | 2026-10-20 | partial | imagem, prévia do link (og:), Turnstile | — |
| S08 Entrar/Cadastrar | 2026-10-20 | partial | confirmação de e-mail, Google, recuperar senha (vêm com Supabase Auth) | — |
| S12 /ir/[code] | 2026-10-20 | done | subId por canal no link de afiliado do dono | — |
| A02 Painel: fila | 2026-10-20 | partial | ações em lote, editar antes de aprovar | — |
| S03, S04, S05, S07, S09, S10, S11, S13 | 2026-10-20 | stub | tudo (rota provisória em `app/[...rest]`) | — |

## Fatia vertical verificada no navegador (localhost, 2026-10-20)

1. Cadastro de usuário novo → logado e redirecionado para `/publicar`.
2. Envio vazio/inválido → mensagens por campo, valores mantidos.
3. Oferta válida com `?tag=tagdoautor-20` → status pendente, invisível no feed público.
4. Admin → `/painel` mostra a oferta e o link do autor → Aprovar → fila vazia, oferta no feed.
5. `/ir/<code>` → 302 para `https://www.amazon.com.br/dp/TESTE123?tag=tagdoautor-20` (link do autor intacto), `no-store`, `noindex`.
6. Código inexistente → volta para a home. Rotas protegidas sem login → `/entrar?next=...`.

Capturas: `replica/clone-screens/` (desktop 1440 e celular 390).

| backend | 2026-10-20 | partial | chave secreta + seed + teste com 2 contas; SMTP; templates de e-mail | limite de 2 projetos gratuitos no Supabase (Big pausado a pedido) |
| S08b Recuperar/nova senha | 2026-10-20 | done (código) | testar com e-mail real | — |

## 2026-10-21: painel, verificação, robô, envio, testes e segurança

| Bloco | Estado | Observação |
| --- | --- | --- |
| Painel A02-A13 | done | fila em lote, ofertas e cupons, usuários, lojas, domínios bloqueados, integrações, robô, canais, execuções, métricas, anúncios, aparência, páginas |
| Verificação de preço | done | histórico por anúncio, selos, reconferência, expiração; sem comparação com outras lojas (sem API) |
| Robô Shopee, canais Telegram/WhatsApp, vendas | partial | testado contra servidor de mentira; falta credencial real |
| Cookies e AdSense | done | aviso, script só após aceite, ads.txt, ID pelo painel |
| Deploy | partial | Dockerfile, Actions, stack; falta primeiro push |
| Testes | done | 99 unitários e 80 ponta a ponta (Playwright) |
| Segurança | done | CSP e cabeçalhos, hierarquia da equipe, limites de tentativa, senha para ações sensíveis, link expandido e conferido |

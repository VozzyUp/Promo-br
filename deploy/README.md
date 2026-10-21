# Deploy

1. No GitHub (Settings > Secrets and variables > Actions > Variables), crie: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`. Elas vão para dentro do código na hora do build.
2. Todo push na `main` roda tsc, lint e testes, e publica `ghcr.io/<dono>/promo-br:latest` (e a tag `sha-…`).
3. No Portainer, crie a stack com `deploy/stack.yml` e defina: `IMAGE`, `DOMAIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `HASH_SALT` (e `TRAEFIK_NETWORK` / `TRAEFIK_RESOLVER` se os nomes forem diferentes).
4. Se o pacote do ghcr for privado, o Swarm precisa de login no registro (`docker login ghcr.io` no nó, ou credencial no Portainer).
5. Saúde: `GET /api/health`.

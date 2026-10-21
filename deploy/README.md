# Deploy

1. No GitHub (Settings > Secrets and variables > Actions > Variables), crie: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`. Elas vão para dentro do código na hora do build.
2. Todo push na `main` roda tsc, lint e testes, e publica `ghcr.io/<dono>/promo-br:latest` (e a tag `sha-…`).
3. No Portainer, crie a stack com `deploy/stack.yml` e defina: `IMAGE`, `DOMAIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `HASH_SALT` (e `TRAEFIK_NETWORK` / `TRAEFIK_RESOLVER` se os nomes forem diferentes).
4. Se o pacote do ghcr for privado, o Swarm precisa de login no registro (`docker login ghcr.io` no nó, ou credencial no Portainer).
5. Saúde: `GET /api/health`.
6. `MASTER_KEY`: gere uma vez e guarde uma cópia fora do servidor. Se ela mudar, as credenciais salvas em Painel > Integrações ficam ilegíveis e é preciso digitá-las de novo.
7. `WORKER_ENABLED=1` liga o agendador interno no mesmo processo do site. Use uma réplica só (a stack já usa): com mais réplicas o robô e o envio rodariam em duplicidade.
8. Depois do primeiro deploy: Painel > Integrações (testar conexão), Painel > Robô, Painel > Canais, Painel > Anúncios e Painel > Páginas. Confira também `https://SEU_DOMINIO/ads.txt` depois de informar o ID do AdSense.
9. Cabeçalhos de segurança e CSP vêm do próprio app. Se o AdSense for bloqueado, defina `CSP_REPORT_ONLY=1` para só avisar no console e ajuste `lib/security-headers.ts`.

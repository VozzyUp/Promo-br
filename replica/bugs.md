# Bugs encontrados nos testes

Severidade: S1 perda de dados ou falha de segurança grave, S2 recurso quebrado sem saída, S3 quebrado com saída ou visivelmente errado, S4 cosmético.

| ID | Sev | O que era | Como reproduzir | Correção |
| --- | --- | --- | --- | --- |
| B01 | S2 (segurança) | Moderador podia suspender, tirar a confiança de ou mexer em admin e em outro moderador | No painel Usuários, logado como moderador, suspender um admin | `lib/staff-rules.ts` (`canActOn`) + checagem do papel do alvo em `userStaffAction`; teste `tests/staff-rules.test.ts` |
| B02 | S2 (segurança) | Site sem cabeçalhos de segurança: sem CSP, sem proteção contra clickjacking, sem nosniff | `curl -I /` | `lib/security-headers.ts` ligado em `next.config.ts`; teste `S-HDR` |
| B03 | S3 (segurança) | Contador de cliques confiava no primeiro IP de `x-forwarded-for` (dá para falsificar e inflar cliques) e usava um sal conhecido quando faltava `HASH_SALT` | Mandar `X-Forwarded-For` diferente a cada clique | Usa o último IP (o que o proxy acrescenta) e sal aleatório do processo como reserva (`lib/auth.ts`) |
| B04 | S3 | Passo a passo de publicar: quando o servidor recusava algo de um passo anterior (ex.: arquivo que não é imagem), a pessoa ficava na Revisão vendo só "Confira os campos marcados" e o campo marcado estava escondido | Cupom com `falsa.png` com texto dentro, publicar | `STEP_OF_FIELD` em `components/publish/wizard.tsx` leva ao primeiro passo com erro; teste `P-2` |
| B05 | S3 | Painel de lojas: link dentro do `<summary>` (controle dentro de controle), falha de acessibilidade | Teste axe em `/painel/lojas` | Link movido para dentro da área aberta; teste `A-PANEL /painel/lojas` |
| B06 | S3 | `/busca` dava erro 500 (config de texto com prefixo `public.`) | `/busca?q=teclado` | Corrigido antes (commit `d0b3e8d`); coberto por `F-PUB busca` |

## A conferir (não reproduzido ainda)
- Anúncios do AdSense sob a CSP nova: só dá para testar com a conta aprovada. Se algo for bloqueado, definir `CSP_REPORT_ONLY=1` e ajustar a lista em `lib/security-headers.ts`.
- Trocar e-mail e apagar conta não pedem a senha de novo (a troca de senha pede). Trocar e-mail exige confirmar pelo link do e-mail.
- Login e cadastro dependem só do limite de tentativas do Supabase. Considerar Turnstile.
- Proteção contra senha vazada (HaveIBeenPwned) está desligada no Supabase Auth: ligar exige plano Pro.
- `npm audit` (só desenvolvimento): 5 alertas altos na cadeia do `eslint-config-next`. Não vão para o site. Em produção: 0.
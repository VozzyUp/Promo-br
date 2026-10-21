# Bugs encontrados nos testes

Severidade: S1 perda de dados ou falha de segurança grave, S2 recurso quebrado sem saída, S3 quebrado com saída ou visivelmente errado, S4 cosmético.

| ID | Sev | O que era | Como reproduzir | Correção |
| --- | --- | --- | --- | --- |
| B01 | S2 (segurança) | Moderador podia suspender, tirar a confiança de ou mexer em admin e em outro moderador | No painel Usuários, logado como moderador, suspender um admin | `lib/staff-rules.ts` (`canActOn`) + checagem do papel do alvo em `userStaffAction`; teste `tests/staff-rules.test.ts` |
| B02 | S2 (segurança) | Site sem cabeçalhos de segurança: sem CSP, sem proteção contra clickjacking, sem nosniff | `curl -I /` | `lib/security-headers.ts` ligado em `next.config.ts`; teste `S-HDR` |
| B03 | S3 (segurança) | Contador de cliques confiava no primeiro IP de `x-forwarded-for` (dá para falsificar e inflar cliques) e usava um sal conhecido quando faltava `HASH_SALT` | Mandar `X-Forwarded-For` diferente a cada clique | Usa o último IP (o que o proxy acrescenta) e sal aleatório do processo como reserva (`lib/auth.ts`) |
| B04 | S3 | Passo a passo de publicar: quando o servidor recusava algo de um passo anterior (ex.: arquivo que não é imagem), a pessoa ficava na Revisão vendo só "Confira os campos marcados" e o campo marcado estava escondido | Cupom com `falsa.png` com texto dentro, publicar | `STEP_OF_FIELD` em `components/publish/wizard.tsx` leva ao primeiro passo com erro; teste `P-2` |
| B05 | S3 | Painel de lojas: link dentro do `<summary>` (controle dentro de controle), falha de acessibilidade | Teste axe em `/painel/lojas` | Link movido para dentro da área aberta; teste `A-PANEL /painel/lojas` |
| B07 | S1 (regra de negócio) | O robô marcava as próprias ofertas como "desconto inflado" e as recusava todas: o primeiro preço que ele registra entrava no histórico da própria oferta, então o preço "de" da loja parecia 66% acima | Pipeline completo contra o servidor de mentira (`e2e/integration/pipeline.spec.ts`) | O preço registrado junto com a oferta não conta como histórico; "inflado" só vale com 7 dias ou mais de histórico (`lib/data/verification.ts`, `lib/price-check.ts`); testes em `tests/price-check.test.ts` |
| B08 | S2 | Formulários do painel (React 19) voltavam ao valor inicial depois de qualquer envio, até quando o servidor recusava: quem errava o cron ou o modelo da mensagem perdia tudo que digitou | `e2e/panel-actions.spec.ts` M-6 e M-7 | `components/admin/use-keep-form.ts` envia sem limpar os campos; aplicado em todos os formulários do painel |
| B09 | S3 | Textos diziam que o preço é conferido "em outras lojas", o que o site não faz | Revisão de textos | Passam a dizer que comparam com o histórico do produto |
| B06 | S3 | `/busca` dava erro 500 (config de texto com prefixo `public.`) | `/busca?q=teclado` | Corrigido antes (commit `d0b3e8d`); coberto por `F-PUB busca` |

## A conferir (não reproduzido ainda)
- Anúncios do AdSense sob a CSP nova: só dá para testar com a conta aprovada. Se algo for bloqueado, definir `CSP_REPORT_ONLY=1` e ajustar a lista em `lib/security-headers.ts`.
- Trocar e-mail e apagar conta agora pedem a senha atual (corrigido). Trocar e-mail ainda exige confirmar pelo link enviado.
- O endereço do site nas mensagens do Telegram e WhatsApp vem de `NEXT_PUBLIC_SITE_URL`, que o Next grava no build: no Docker ele precisa chegar como argumento de build (o workflow já passa).
- A API real da Shopee e a Bot API real do Telegram só foram exercitadas por servidores de mentira: os nomes dos campos da Shopee vêm da documentação pública e podem exigir ajuste no primeiro "Testar conexão" com credenciais reais.
- Login e cadastro dependem só do limite de tentativas do Supabase. Considerar Turnstile.
- Proteção contra senha vazada (HaveIBeenPwned) está desligada no Supabase Auth: ligar exige plano Pro.
- `npm audit` (só desenvolvimento): 5 alertas altos na cadeia do `eslint-config-next`. Não vão para o site. Em produção: 0.
-- Limpeza dos dados criados pelos testes e pelas conferências manuais.
-- Rode no SQL Editor do Supabase quando quiser o banco limpo (por exemplo antes do lançamento).
-- Confira os números com os selects antes de rodar os deletes.

-- 1) O que existe de teste
select 'ofertas [e2e]' as o_que, count(*) from deals where title like '[e2e]%'
union all select 'ofertas do robô de teste', count(*) from deals where source = 'robot' and title like '%Stub%'
union all select 'vendas de teste', count(*) from conversions where order_ref like 'E2E-STUB%'
union all select 'discussões [e2e]', count(*) from discussions where title like '[e2e]%'
union all select 'regras do robô', count(*) from robot_rules
union all select 'canais', count(*) from channels
union all select 'integrações', count(*) from integrations
union all select 'domínios bloqueados', count(*) from blocked_domains;

-- 2) Apagar (as ofertas levam junto histórico, imagens registradas, cliques e verificações por cascata)
delete from conversions where order_ref like 'E2E-STUB%';
delete from deals where title like '[e2e]%' or (source = 'robot' and (title like '%Stub%' or coupon_code like 'STUB%'));
delete from discussions where title like '[e2e]%';
delete from robot_rules where name = 'Teste robô' or name like 'Regra e2e %' or name like 'Regra int %' or name = 'Regra debug';
delete from channels where name = 'Canal de teste' or name like 'Canal e2e %' or name like 'Canal int %';
delete from blocked_domains where domain in ('golpe-teste.com') or domain like 'bloqueado-%';
-- As integrações de teste foram salvas com uma chave de teste e ficam desligadas; apague para recomeçar do zero:
-- (a conta do Telegram logada em Painel > Fontes fica: nenhum teste mexe nela)
delete from integrations where key <> 'telegram_user';
-- Execuções antigas do agendador
delete from job_runs;
-- produto criado pelo teste de comparação por código de barras (e2e/product-compare.spec.ts)
delete from products where ean = '4006381333931';
-- fontes criadas pelo teste do Telegram (e2e/integration/sources.spec.ts); só funciona depois da migração 8
delete from sources where name like 'Fonte int %';


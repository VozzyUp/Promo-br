-- Limpeza dos dados criados pelos testes e pelas conferências manuais.
-- Rode no SQL Editor do Supabase quando quiser o banco limpo (por exemplo antes do lançamento).
-- Confira os números com os selects antes de rodar os deletes.

-- 1) O que existe de teste
select 'ofertas [e2e]' as o_que, count(*) from deals where title like '[e2e]%'
union all select 'ofertas do robô de teste', count(*) from deals where title like '%Stub%'
union all select 'vendas de teste', count(*) from conversions where order_ref like 'E2E-STUB%'
union all select 'discussões [e2e]', count(*) from discussions where title like '[e2e]%'
union all select 'regras do robô', count(*) from robot_rules
union all select 'canais', count(*) from channels
union all select 'integrações', count(*) from integrations
union all select 'domínios bloqueados', count(*) from blocked_domains;

-- 2) Apagar (as ofertas levam junto histórico, imagens registradas, cliques e verificações por cascata)
delete from conversions where order_ref like 'E2E-STUB%';
delete from deals where title like '[e2e]%' or title like '%Stub%';
delete from discussions where title like '[e2e]%';
delete from robot_rules where name in ('Teste robô') or name like 'Regra %';
delete from channels where name in ('Canal de teste') or name like 'Canal %';
delete from blocked_domains where domain in ('golpe-teste.com') or domain like 'bloqueado-%';
-- As integrações de teste foram salvas com uma chave de teste e ficam desligadas; apague para recomeçar do zero:
delete from integrations;
-- Execuções antigas do agendador
delete from job_runs;
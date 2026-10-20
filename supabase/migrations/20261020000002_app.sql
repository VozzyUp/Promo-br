-- promo-br: funções do app. Operações que precisam ser atômicas ficam no banco;
-- o Next as chama com a service role. Nenhuma delas é executável por anon/authenticated.

-------------------------------------------------------------------------------
-- Perfil criado junto com o usuário do Supabase Auth (dados vêm do signUp)
-------------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), new.raw_user_meta_data ->> 'username')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- Ranking ao vivo. Fórmula de replica/recon.md; os pesos vão para site_settings
-- quando o painel de ranking (A10) existir. O job rank_deals passa a gravar hot_score.
-------------------------------------------------------------------------------
create or replace view public.deals_ranked with (security_invoker = on) as
select d.*,
  (
    0.5 * coalesce(d.real_discount_bp, 0) / 100.0
    + 4 * ln(1 + d.clicks_24h + d.clicks_total / 10.0)
    + 1.5 * (d.votes_up - d.votes_down)
    + 8 * (d.verdict = 'verified')::int
  ) / power(extract(epoch from (now() - coalesce(d.published_at, d.created_at))) / 3600.0 + 2, 1.5) as hot_now
from public.deals d;

-------------------------------------------------------------------------------
-- Voto: clicar de novo no mesmo voto desfaz. Contadores mantidos pelo trigger.
-------------------------------------------------------------------------------
create or replace function public.vote_toggle(p_deal uuid, p_user uuid, p_value smallint)
returns table (temperature integer, my_vote smallint)
language plpgsql set search_path = public as $$
declare
  prev smallint;
begin
  if p_value not in (-1, 1) then raise exception 'invalid vote'; end if;
  perform 1 from deals where id = p_deal and status = 'published' for update;
  if not found then return; end if;

  select value into prev from votes where deal_id = p_deal and user_id = p_user;
  if prev = p_value then
    delete from votes where deal_id = p_deal and user_id = p_user;
  elsif prev is null then
    insert into votes (deal_id, user_id, value) values (p_deal, p_user, p_value);
  else
    update votes set value = p_value, created_at = now() where deal_id = p_deal and user_id = p_user;
  end if;

  return query
    select (d.votes_up - d.votes_down) * 10,
           coalesce((select v.value from votes v where v.deal_id = p_deal and v.user_id = p_user), 0::smallint)
    from deals d where d.id = p_deal;
end $$;

-------------------------------------------------------------------------------
-- Clique: 1 por visitante/oferta/dia (o hash já inclui o dia). Robôs não chegam aqui.
-------------------------------------------------------------------------------
create or replace function public.record_click(
  p_deal uuid, p_visitor text, p_channel text, p_user uuid, p_link_used text
) returns boolean
language plpgsql set search_path = public as $$
declare
  inserted integer;
begin
  insert into clicks (deal_id, user_id, visitor_hash, channel, link_used)
  values (p_deal, p_user, p_visitor, p_channel, p_link_used)
  on conflict (deal_id, visitor_hash) where is_bot = false do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    update deals set clicks_total = clicks_total + 1, clicks_24h = clicks_24h + 1 where id = p_deal;
  end if;
  return inserted > 0;
end $$;

-------------------------------------------------------------------------------
-- Moderação da fila: aprova/reprova, reputação e confiança do autor, trilha de auditoria.
-------------------------------------------------------------------------------
create or replace function public.moderate_deal(
  p_deal uuid, p_action text, p_reason text, p_moderator uuid
) returns uuid
language plpgsql set search_path = public as $$
declare
  d deals%rowtype;
begin
  if p_action not in ('approve', 'reject') then raise exception 'invalid action'; end if;
  select * into d from deals where id = p_deal and status = 'pending' for update;
  if not found then return null; end if;

  if p_action = 'approve' then
    update deals set status = 'published', published_at = now() where id = p_deal;
    update profiles set
      approved_posts = approved_posts + 1,
      reputation = reputation + 10,
      trusted = trusted or approved_posts + 1 >= 3
    where id = d.author_id;
    insert into reputation_events (user_id, deal_id, kind, points) values (d.author_id, p_deal, 'post_approved', 10);
  else
    update deals set status = 'rejected', reject_reason = p_reason where id = p_deal;
  end if;

  insert into moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (p_moderator, 'deal', p_deal, p_action, p_reason);
  return p_deal;
end $$;

-------------------------------------------------------------------------------
-- Só o servidor (service role) chama estas funções
-------------------------------------------------------------------------------
revoke execute on function public.vote_toggle(uuid, uuid, smallint) from public, anon, authenticated;
revoke execute on function public.record_click(uuid, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.moderate_deal(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.vote_toggle(uuid, uuid, smallint) to service_role;
grant execute on function public.record_click(uuid, text, text, uuid, text) to service_role;
grant execute on function public.moderate_deal(uuid, text, text, uuid) to service_role;

-------------------------------------------------------------------------------
-- Imagens das ofertas: leitura pública, upload só pelo servidor, 2 MB, só imagem
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deal-images', 'deal-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-------------------------------------------------------------------------------
-- Dados de referência (lojas e categorias). Ofertas de exemplo: scripts/seed.mjs.
-------------------------------------------------------------------------------
insert into categories (name, slug, sort) values
  ('Eletrônicos', 'eletronicos', 1), ('Casa e cozinha', 'casa-e-cozinha', 2), ('Games', 'games', 3),
  ('Moda', 'moda', 4), ('Mercado', 'mercado', 5), ('Beleza e saúde', 'beleza-e-saude', 6),
  ('Viagem', 'viagem', 7), ('Outros', 'outros', 99)
on conflict (slug) do nothing;

insert into stores (name, slug, domains) values
  ('Amazon', 'amazon', array['amazon.com.br', 'amzn.to']),
  ('Mercado Livre', 'mercado-livre', array['mercadolivre.com.br', 'mercadolivre.com', 'meli.la']),
  ('Shopee', 'shopee', array['shopee.com.br', 's.shopee.com.br']),
  ('Magalu', 'magalu', array['magazineluiza.com.br', 'magalu.com']),
  ('KaBuM!', 'kabum', array['kabum.com.br']),
  ('Casas Bahia', 'casas-bahia', array['casasbahia.com.br']),
  ('AliExpress', 'aliexpress', array['aliexpress.com', 'pt.aliexpress.com', 's.click.aliexpress.com'])
on conflict (slug) do nothing;

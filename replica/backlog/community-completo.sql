-- promo-br: comunidade. Discussões, comentários com reações, salvos, seguir/ignorar, notificações,
-- mensagens, pontos, medalhas, ajustes e os campos novos das ofertas (passo a passo de publicar).
-- Toda escrita continua só pelo servidor (chave secreta); as funções abaixo não são executáveis por anon/authenticated.

-------------------------------------------------------------------------------
-- Perfis
-------------------------------------------------------------------------------
alter table public.profiles
  add column bio text check (char_length(bio) <= 200),
  add column username_changed_at timestamptz;

-------------------------------------------------------------------------------
-- Ofertas: campos do passo a passo, oferta sem link, chave de duplicata, autor opcional (LGPD)
-------------------------------------------------------------------------------
alter table public.deals
  alter column url_submitted drop not null,
  alter column author_id drop not null,
  add column starts_at timestamptz,
  add column availability text not null default 'online' check (availability in ('online', 'offline')),
  add column shipping_cents integer check (shipping_cents >= 0),
  add column ships_from text check (char_length(ships_from) <= 60),
  add column coupon_kind text check (coupon_kind in ('percent', 'amount', 'free_shipping', 'other')),
  add column coupon_amount_cents integer check (coupon_amount_cents >= 0),
  add column url_key text,
  add column expired_by uuid references public.profiles (id) on delete set null;
alter table public.deals drop constraint deals_author_id_fkey;
alter table public.deals add constraint deals_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;
create index deals_url_key on public.deals (url_key) where status in ('pending', 'published');
create index deals_expired_by on public.deals (expired_by);

create table public.deal_images (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index on public.deal_images (deal_id, position);

-- A view precisa ser refeita para incluir as colunas novas de deals.
drop view public.deals_ranked;
create view public.deals_ranked with (security_invoker = on) as
select d.*,
  (
    0.5 * coalesce(d.real_discount_bp, 0) / 100.0
    + 4 * ln(1 + d.clicks_24h + d.clicks_total / 10.0)
    + 1.5 * (d.votes_up - d.votes_down)
    + 8 * (d.verdict = 'verified')::int
  ) / power(extract(epoch from (now() - coalesce(d.published_at, d.created_at))) / 3600.0 + 2, 1.5) as hot_now
from public.deals d;

-------------------------------------------------------------------------------
-- Discussões
-------------------------------------------------------------------------------
create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 10 and 140),
  body text not null default '' check (char_length(body) <= 5000),
  kind text not null check (kind in ('intro', 'stores', 'request', 'international', 'tips', 'contests', 'other')),
  category_id uuid references public.categories (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  status text not null default 'published' check (status in ('published', 'removed')),
  comments_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('public.pt_unaccent', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('public.pt_unaccent', coalesce(body, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.discussions (last_activity_at desc) where status = 'published';
create index on public.discussions (author_id);
create index on public.discussions (category_id);
create index discussions_search on public.discussions using gin (search);
create trigger t_discussions_upd before update on public.discussions for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- Comentários: servem a ofertas e a discussões, com reações
-------------------------------------------------------------------------------
alter table public.comments
  alter column user_id drop not null,
  alter column deal_id drop not null,
  add column thread_id uuid references public.discussions (id) on delete cascade,
  add column likes_count integer not null default 0,
  add column helpful_count integer not null default 0,
  add column haha_count integer not null default 0;
alter table public.comments drop constraint comments_user_id_fkey;
alter table public.comments add constraint comments_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;
alter table public.comments add constraint comment_target check ((deal_id is not null) <> (thread_id is not null));
create index on public.comments (thread_id, created_at);

create table public.comment_reactions (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'helpful', 'haha')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index on public.comment_reactions (user_id);

create or replace function public.comments_counter() returns trigger language plpgsql set search_path = public as $$
declare d uuid; t uuid;
begin
  d := coalesce(new.deal_id, old.deal_id);
  t := coalesce(new.thread_id, old.thread_id);
  if d is not null then
    update deals set comments_count = (select count(*) from comments where deal_id = d and status = 'visible') where id = d;
  end if;
  if t is not null then
    update discussions set
      comments_count = (select count(*) from comments where thread_id = t and status = 'visible'),
      last_activity_at = case when tg_op = 'INSERT' then now() else last_activity_at end
    where id = t;
  end if;
  return null;
end $$;
drop trigger t_comments_counter on public.comments;
create trigger t_comments_counter after insert or update of status or delete on public.comments
  for each row execute function public.comments_counter();

-------------------------------------------------------------------------------
-- Salvos, inscrições, seguir/ignorar, mensagens, ajustes, medalhas
-------------------------------------------------------------------------------
create table public.saved_deals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, deal_id)
);
create index on public.saved_deals (deal_id);

create table public.deal_subscriptions (
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deal_id, user_id)
);
create index on public.deal_subscriptions (user_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('follow', 'ignore')),
  created_at timestamptz not null default now(),
  primary key (follower_id, target_id),
  check (follower_id <> target_id)
);
create index on public.follows (target_id, kind);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index on public.messages (recipient_id, created_at desc);
create index on public.messages (sender_id, recipient_id, created_at desc);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  deal_id uuid references public.deals (id) on delete cascade,
  thread_id uuid references public.discussions (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;
create index on public.notifications (actor_id);
create index on public.notifications (deal_id);
create index on public.notifications (thread_id);
create index on public.notifications (comment_id);

-- Pontos: cada ganho é um evento único (a mesma oferta/comentário/semana nunca paga duas vezes)
alter table public.reputation_events add column ref text;
create unique index reputation_ref_once on public.reputation_events (user_id, kind, ref) where ref is not null;
create unique index reputation_hot_once on public.reputation_events (user_id, deal_id, kind) where kind = 'hot_100';

-------------------------------------------------------------------------------
-- Funções
-------------------------------------------------------------------------------
create or replace function public.push_notification(
  p_user uuid, p_kind text, p_actor uuid, p_deal uuid, p_comment uuid, p_thread uuid, p_data jsonb default '{}'
) returns void language plpgsql set search_path = public as $$
begin
  if p_user is null or p_user is not distinct from p_actor then return; end if;
  if exists (select 1 from user_settings s where s.user_id = p_user and (s.prefs -> 'notify' ->> p_kind) = 'false') then
    return;
  end if;
  insert into notifications (user_id, kind, actor_id, deal_id, comment_id, thread_id, data)
  values (p_user, p_kind, p_actor, p_deal, p_comment, p_thread, coalesce(p_data, '{}'));
end $$;

-- Dá pontos uma única vez por (kind, ref) e avisa quando o nível sobe (Prata 10, Ouro 40, Platina 300).
create or replace function public.award_points(p_user uuid, p_kind text, p_points integer, p_ref text, p_deal uuid)
returns boolean language plpgsql set search_path = public as $$
declare before_pts integer; after_pts integer; ins integer;
begin
  if p_user is null then return false; end if;
  select coalesce(sum(points), 0) into before_pts from reputation_events
  where user_id = p_user and kind in ('hot_100', 'helpful_comment', 'weekly_votes', 'streak_bonus')
    and created_at > now() - interval '12 months';
  insert into reputation_events (user_id, deal_id, kind, points, ref) values (p_user, p_deal, p_kind, p_points, p_ref)
  on conflict do nothing;
  get diagnostics ins = row_count;
  if ins = 0 then return false; end if;
  after_pts := before_pts + p_points;
  if before_pts < 300 and after_pts >= 300 then
    perform push_notification(p_user, 'level_up', null, null, null, null, '{"level":"platina"}');
  elsif before_pts < 40 and after_pts >= 40 then
    perform push_notification(p_user, 'level_up', null, null, null, null, '{"level":"ouro"}');
  elsif before_pts < 10 and after_pts >= 10 then
    perform push_notification(p_user, 'level_up', null, null, null, null, '{"level":"prata"}');
  end if;
  return true;
end $$;

create or replace function public.votes_counter() returns trigger language plpgsql set search_path = public as $$
declare d record;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update deals set votes_up = votes_up - (old.value = 1)::int, votes_down = votes_down - (old.value = -1)::int
    where id = old.deal_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update deals set votes_up = votes_up + (new.value = 1)::int, votes_down = votes_down + (new.value = -1)::int
    where id = new.deal_id;
    select author_id, votes_up, votes_down into d from deals where id = new.deal_id;
    if d.author_id is not null and (d.votes_up - d.votes_down) * 10 >= 100 then
      if award_points(d.author_id, 'hot_100', 10, null, new.deal_id) then
        perform push_notification(d.author_id, 'deal_hot', null, new.deal_id, null, null, '{}');
      end if;
    end if;
  end if;
  return null;
end $$;

-- Voto: clicar de novo no mesmo voto desfaz. A 3ª votação da semana dá 1 ponto; sequências dão bônus (2, 5 e 10 semanas).
create or replace function public.vote_toggle(p_deal uuid, p_user uuid, p_value smallint)
returns table (temperature integer, my_vote smallint)
language plpgsql set search_path = public as $$
declare
  prev smallint; wk_start timestamptz; wk_key text; n integer; streak integer := 0; i integer := 0;
begin
  if p_value not in (-1, 1) then raise exception 'invalid vote'; end if;
  perform 1 from deals where id = p_deal and status = 'published' for update;
  if not found then return; end if;

  select value into prev from votes where deal_id = p_deal and user_id = p_user;
  if prev = p_value then
    delete from votes where deal_id = p_deal and user_id = p_user;
  elsif prev is null then
    insert into votes (deal_id, user_id, value) values (p_deal, p_user, p_value);
    wk_start := date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
    wk_key := to_char(now() at time zone 'America/Sao_Paulo', 'IYYY-"W"IW');
    select count(*) into n from votes where user_id = p_user and created_at >= wk_start;
    if n >= 3 and award_points(p_user, 'weekly_votes', 1, wk_key, null) then
      loop
        exit when i > 60 or not exists (
          select 1 from reputation_events where user_id = p_user and kind = 'weekly_votes'
            and ref = to_char((now() - make_interval(weeks => i)) at time zone 'America/Sao_Paulo', 'IYYY-"W"IW'));
        streak := streak + 1;
        i := i + 1;
      end loop;
      if streak = 2 then perform award_points(p_user, 'streak_bonus', 1, wk_key, null);
      elsif streak = 5 then perform award_points(p_user, 'streak_bonus', 5, wk_key, null);
      elsif streak = 10 then perform award_points(p_user, 'streak_bonus', 10, wk_key, null);
      end if;
    end if;
  else
    update votes set value = p_value, created_at = now() where deal_id = p_deal and user_id = p_user;
  end if;

  return query
    select (d.votes_up - d.votes_down) * 10,
           coalesce((select v.value from votes v where v.deal_id = p_deal and v.user_id = p_user), 0::smallint)
    from deals d where d.id = p_deal;
end $$;

-- Quando uma oferta entra no ar: avisa quem segue o autor e quem tem alerta que combina.
create or replace function public.on_deal_published(p_deal uuid) returns void
language plpgsql set search_path = public as $$
declare d record; r record;
begin
  select id, author_id, price_cents, category_id, search into d from deals where id = p_deal and status = 'published';
  if not found then return; end if;
  for r in select f.follower_id as uid from follows f
           where f.target_id = d.author_id and f.kind = 'follow'
             and not exists (select 1 from follows i where i.follower_id = f.follower_id and i.target_id = d.author_id and i.kind = 'ignore')
  loop
    perform push_notification(r.uid, 'follow_post', d.author_id, p_deal, null, null, '{}');
  end loop;
  for r in select distinct a.user_id as uid from alerts a
           where a.active and a.user_id is distinct from d.author_id
             and (a.category_id is null or a.category_id = d.category_id)
             and (a.max_price_cents is null or (d.price_cents is not null and d.price_cents <= a.max_price_cents))
             and d.search @@ plainto_tsquery('public.pt_unaccent', a.keyword)
  loop
    perform push_notification(r.uid, 'alert_match', null, p_deal, null, null, '{}');
  end loop;
end $$;

create or replace function public.moderate_deal(p_deal uuid, p_action text, p_reason text, p_moderator uuid)
returns uuid language plpgsql set search_path = public as $$
declare d deals%rowtype;
begin
  if p_action not in ('approve', 'reject') then raise exception 'invalid action'; end if;
  select * into d from deals where id = p_deal and status = 'pending' for update;
  if not found then return null; end if;

  if p_action = 'approve' then
    update deals set status = 'published', published_at = now() where id = p_deal;
    if d.author_id is not null then
      update profiles set
        approved_posts = approved_posts + 1,
        reputation = reputation + 10,
        trusted = trusted or approved_posts + 1 >= 3
      where id = d.author_id;
      insert into reputation_events (user_id, deal_id, kind, points) values (d.author_id, p_deal, 'post_approved', 10);
      perform push_notification(d.author_id, 'deal_approved', p_moderator, p_deal, null, null, '{}');
    end if;
    perform on_deal_published(p_deal);
  else
    update deals set status = 'rejected', reject_reason = p_reason where id = p_deal;
    perform push_notification(d.author_id, 'deal_rejected', p_moderator, p_deal, null, null, jsonb_build_object('reason', p_reason));
  end if;

  insert into moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (p_moderator, 'deal', p_deal, p_action, p_reason);
  return p_deal;
end $$;

-- Comentário atômico: grava, inscreve quem comentou e avisa menções, resposta, autor e inscritos (sem repetir pessoa).
create or replace function public.create_comment(
  p_deal uuid, p_thread uuid, p_user uuid, p_parent uuid, p_body text, p_mentions uuid[]
) returns uuid language plpgsql set search_path = public as $$
declare
  cid uuid; owner uuid; parent_author uuid; root uuid; notified uuid[] := '{}'; s uuid; m uuid; auto_sub boolean;
begin
  if (p_deal is null) = (p_thread is null) then raise exception 'target'; end if;
  if p_deal is not null then
    select author_id into owner from deals where id = p_deal and status in ('published', 'expired');
    if not found then raise exception 'deal not found'; end if;
  else
    select author_id into owner from discussions where id = p_thread and status = 'published';
    if not found then raise exception 'thread not found'; end if;
  end if;
  if p_parent is not null then
    select user_id, parent_id into parent_author, root from comments
    where id = p_parent and status = 'visible' and deal_id is not distinct from p_deal and thread_id is not distinct from p_thread;
    if not found then raise exception 'parent not found'; end if;
    if root is not null then p_parent := root; end if;  -- só 2 níveis: resposta de resposta vira irmã
  end if;

  insert into comments (deal_id, thread_id, user_id, parent_id, body)
  values (p_deal, p_thread, p_user, p_parent, p_body) returning id into cid;

  foreach m in array coalesce(p_mentions, '{}') loop
    if m <> p_user and not (m = any (notified)) then
      perform push_notification(m, 'mention', p_user, p_deal, cid, p_thread, '{}');
      notified := notified || m;
    end if;
  end loop;
  if parent_author is not null and parent_author <> p_user and not (parent_author = any (notified)) then
    perform push_notification(parent_author, 'reply', p_user, p_deal, cid, p_thread, '{}');
    notified := notified || parent_author;
  end if;
  if owner is not null and owner <> p_user and not (owner = any (notified)) then
    perform push_notification(owner, 'comment', p_user, p_deal, cid, p_thread, '{}');
    notified := notified || owner;
  end if;
  if p_deal is not null then
    for s in select user_id from deal_subscriptions where deal_id = p_deal and user_id <> p_user loop
      if not (s = any (notified)) then
        perform push_notification(s, 'subscribed_comment', p_user, p_deal, cid, null, '{}');
        notified := notified || s;
      end if;
    end loop;
    select coalesce((prefs ->> 'auto_subscribe')::boolean, true) into auto_sub from user_settings where user_id = p_user;
    if coalesce(auto_sub, true) then
      insert into deal_subscriptions (deal_id, user_id) values (p_deal, p_user) on conflict do nothing;
    end if;
  end if;
  return cid;
end $$;

-- Reação: mesma reação de novo remove; outra troca. Não vale reagir ao próprio comentário.
create or replace function public.react_comment(p_comment uuid, p_user uuid, p_kind text)
returns table (likes integer, helpful integer, haha integer, mine text)
language plpgsql set search_path = public as $$
declare prev text; c comments%rowtype; added boolean := false;
begin
  if p_kind not in ('like', 'helpful', 'haha') then raise exception 'kind'; end if;
  select * into c from comments where id = p_comment and status = 'visible';
  if not found then return; end if;
  if c.user_id is not distinct from p_user then
    return query select c.likes_count, c.helpful_count, c.haha_count, null::text;
    return;
  end if;
  select kind into prev from comment_reactions where comment_id = p_comment and user_id = p_user;
  if prev = p_kind then
    delete from comment_reactions where comment_id = p_comment and user_id = p_user;
  elsif prev is null then
    insert into comment_reactions (comment_id, user_id, kind) values (p_comment, p_user, p_kind);
    added := true;
  else
    update comment_reactions set kind = p_kind, created_at = now() where comment_id = p_comment and user_id = p_user;
    added := true;
  end if;
  update comments set
    likes_count = (select count(*) from comment_reactions where comment_id = p_comment and kind = 'like'),
    helpful_count = (select count(*) from comment_reactions where comment_id = p_comment and kind = 'helpful'),
    haha_count = (select count(*) from comment_reactions where comment_id = p_comment and kind = 'haha')
  where id = p_comment returning * into c;
  if added then
    perform push_notification(c.user_id, 'reaction', p_user, c.deal_id, p_comment, c.thread_id, jsonb_build_object('reaction', p_kind));
  end if;
  if c.helpful_count >= 3 and c.user_id is not null then
    if award_points(c.user_id, 'helpful_comment', 10, p_comment::text, c.deal_id) then
      perform push_notification(c.user_id, 'helpful', null, c.deal_id, p_comment, c.thread_id, '{}');
    end if;
  end if;
  return query select c.likes_count, c.helpful_count, c.haha_count,
    (select kind from comment_reactions where comment_id = p_comment and user_id = p_user);
end $$;

-- Denúncia de oferta. 3 pessoas diferentes dizendo "acabou" ou "cupom não funciona" encerram a oferta.
create or replace function public.report_deal(p_deal uuid, p_user uuid, p_kind text, p_note text)
returns text language plpgsql set search_path = public as $$
declare d record; n integer;
begin
  if p_kind not in ('price_changed', 'coupon_failed', 'out_of_stock', 'spam', 'fake') then raise exception 'kind'; end if;
  select id, author_id into d from deals where id = p_deal and status = 'published';
  if not found then return 'not_found'; end if;
  insert into reports (deal_id, reporter_id, reporter_hash, kind, note)
  values (p_deal, p_user, p_user::text, p_kind, left(p_note, 300)) on conflict do nothing;
  if p_kind in ('out_of_stock', 'coupon_failed') then
    select count(distinct reporter_id) into n from reports
    where deal_id = p_deal and kind in ('out_of_stock', 'coupon_failed') and resolved_at is null;
    if n >= 3 then
      update deals set status = 'expired', expired_reason = 'reports' where id = p_deal;
      perform push_notification(d.author_id, 'deal_expired', null, p_deal, null, null, '{}');
      return 'expired';
    end if;
  end if;
  return 'ok';
end $$;

-- Denúncia de comentário. 3 pessoas diferentes escondem o comentário até um moderador revisar.
create or replace function public.report_comment(p_comment uuid, p_user uuid, p_kind text, p_note text)
returns text language plpgsql set search_path = public as $$
declare n integer;
begin
  if p_kind not in ('spam', 'offensive', 'fake') then raise exception 'kind'; end if;
  perform 1 from comments where id = p_comment and status = 'visible';
  if not found then return 'not_found'; end if;
  insert into reports (comment_id, reporter_id, reporter_hash, kind, note)
  values (p_comment, p_user, p_user::text, p_kind, left(p_note, 300)) on conflict do nothing;
  select count(distinct reporter_id) into n from reports where comment_id = p_comment and resolved_at is null;
  if n >= 3 then
    update comments set status = 'hidden' where id = p_comment;
    return 'hidden';
  end if;
  return 'ok';
end $$;

-- Números do perfil (estatísticas e medalhas). Uma consulta só.
create or replace function public.user_stats(p_user uuid) returns jsonb
language sql stable set search_path = public as $$
select jsonb_build_object(
  'votes_total', (select count(*) from votes where user_id = p_user),
  'votes_month', (select count(*) from votes where user_id = p_user and created_at > now() - interval '30 days'),
  'categories_voted_month', (select count(distinct d.category_id) from votes v join deals d on d.id = v.deal_id
                              where v.user_id = p_user and v.created_at > now() - interval '30 days' and d.category_id is not null),
  'votes_on_hot', (select count(*) from votes v join deals d on d.id = v.deal_id
                    where v.user_id = p_user and v.value = 1 and (d.votes_up - d.votes_down) * 10 >= 100),
  'deals_total', (select count(*) from deals where author_id = p_user and status in ('published', 'expired')),
  'deals_active', (select count(*) from deals where author_id = p_user and status = 'published'),
  'hot_deals', (select count(*) from deals where author_id = p_user and status in ('published', 'expired') and (votes_up - votes_down) * 10 >= 100),
  'hot_max', coalesce((select max((votes_up - votes_down) * 10) from deals where author_id = p_user and status in ('published', 'expired')), 0),
  'hot_avg', coalesce((select round(avg((votes_up - votes_down) * 10)) from deals
                        where author_id = p_user and status in ('published', 'expired') and published_at > now() - interval '12 months'), 0),
  'deals_12m', (select count(*) from deals where author_id = p_user and status in ('published', 'expired') and published_at > now() - interval '12 months'),
  'hot_12m', (select count(*) from deals where author_id = p_user and status in ('published', 'expired') and published_at > now() - interval '12 months'
               and (votes_up - votes_down) * 10 >= 100),
  'interactions_deals', (select coalesce(sum(votes_up + votes_down + comments_count), 0) from deals where author_id = p_user and status in ('published', 'expired')),
  'comments_total', (select count(*) from comments where user_id = p_user and status = 'visible'),
  'reactions_received', (select coalesce(sum(likes_count + helpful_count + haha_count), 0) from comments where user_id = p_user),
  'likes_received', (select coalesce(sum(likes_count), 0) from comments where user_id = p_user),
  'helpful_comments', (select count(*) from comments where user_id = p_user and helpful_count >= 3),
  'max_comments_on_deal', coalesce((select max(comments_count) from deals where author_id = p_user and status in ('published', 'expired')), 0),
  'followers', (select count(*) from follows where target_id = p_user and kind = 'follow'),
  'discussions', (select count(*) from discussions where author_id = p_user and status = 'published')
);
$$;

-------------------------------------------------------------------------------
-- Só o servidor chama estas funções
-------------------------------------------------------------------------------
revoke execute on function public.push_notification(uuid, text, uuid, uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.award_points(uuid, text, integer, text, uuid) from public, anon, authenticated;
revoke execute on function public.on_deal_published(uuid) from public, anon, authenticated;
revoke execute on function public.create_comment(uuid, uuid, uuid, uuid, text, uuid[]) from public, anon, authenticated;
revoke execute on function public.react_comment(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.report_deal(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.report_comment(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.user_stats(uuid) from public, anon, authenticated;
revoke execute on function public.vote_toggle(uuid, uuid, smallint) from public, anon, authenticated;
revoke execute on function public.moderate_deal(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.push_notification(uuid, text, uuid, uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.award_points(uuid, text, integer, text, uuid) to service_role;
grant execute on function public.on_deal_published(uuid) to service_role;
grant execute on function public.create_comment(uuid, uuid, uuid, uuid, text, uuid[]) to service_role;
grant execute on function public.react_comment(uuid, uuid, text) to service_role;
grant execute on function public.report_deal(uuid, uuid, text, text) to service_role;
grant execute on function public.report_comment(uuid, uuid, text, text) to service_role;
grant execute on function public.user_stats(uuid) to service_role;
grant execute on function public.vote_toggle(uuid, uuid, smallint) to service_role;
grant execute on function public.moderate_deal(uuid, text, text, uuid) to service_role;

-------------------------------------------------------------------------------
-- RLS: tudo fechado para o navegador, exceto leitura do que é público ou próprio
-------------------------------------------------------------------------------
alter table public.deal_images enable row level security;
alter table public.discussions enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.saved_deals enable row level security;
alter table public.deal_subscriptions enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_badges enable row level security;
alter table public.notifications enable row level security;

create policy pub_read on public.deal_images for select
  using (exists (select 1 from public.deals d where d.id = deal_id and d.status in ('published', 'expired')));
create policy pub_read on public.discussions for select using (status = 'published');
create policy pub_read on public.user_badges for select using (true);
create policy own_read on public.saved_deals for select using (user_id = (select auth.uid()));
create policy own_read on public.deal_subscriptions for select using (user_id = (select auth.uid()));
create policy own_read on public.follows for select using (follower_id = (select auth.uid()));
create policy own_read on public.user_settings for select using (user_id = (select auth.uid()));
create policy own_read on public.notifications for select using (user_id = (select auth.uid()));
create policy own_read on public.messages for select
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

-------------------------------------------------------------------------------
-- Imagens: avatares (1 MB) e ofertas (3 MB por arquivo)
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
update storage.buckets set file_size_limit = 3145728 where id = 'deal-images';

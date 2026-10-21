-- Fatia 1: comentários com reações, denúncia/expiração de ofertas, notificações básicas.
alter table public.deals add column expired_by uuid references public.profiles (id) on delete set null;
create index deals_expired_by on public.deals (expired_by);

alter table public.comments
  alter column user_id drop not null,
  add column likes_count integer not null default 0,
  add column helpful_count integer not null default 0,
  add column haha_count integer not null default 0;
alter table public.comments drop constraint comments_user_id_fkey;
alter table public.comments add constraint comments_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

create table public.comment_reactions (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'helpful', 'haha')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index on public.comment_reactions (user_id);

create or replace function public.comments_counter() returns trigger language plpgsql set search_path = public as $$
declare d uuid;
begin
  d := coalesce(new.deal_id, old.deal_id);
  update deals set comments_count = (select count(*) from comments where deal_id = d and status = 'visible') where id = d;
  return null;
end $$;
drop trigger t_comments_counter on public.comments;
create trigger t_comments_counter after insert or update of status or delete on public.comments
  for each row execute function public.comments_counter();

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.deal_subscriptions (
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deal_id, user_id)
);
create index on public.deal_subscriptions (user_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  deal_id uuid references public.deals (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;
create index on public.notifications (actor_id);
create index on public.notifications (deal_id);
create index on public.notifications (comment_id);

alter table public.reputation_events add column ref text;
create unique index reputation_ref_once on public.reputation_events (user_id, kind, ref) where ref is not null;

create or replace function public.push_notification(
  p_user uuid, p_kind text, p_actor uuid, p_deal uuid, p_comment uuid, p_data jsonb default '{}'
) returns void language plpgsql set search_path = public as $$
begin
  if p_user is null or p_user is not distinct from p_actor then return; end if;
  if exists (select 1 from user_settings s where s.user_id = p_user and (s.prefs -> 'notify' ->> p_kind) = 'false') then
    return;
  end if;
  insert into notifications (user_id, kind, actor_id, deal_id, comment_id, data)
  values (p_user, p_kind, p_actor, p_deal, p_comment, coalesce(p_data, '{}'));
end $$;

-- Pontos uma única vez por (kind, ref); avisa quando o nível sobe (Prata 10, Ouro 40, Platina 300).
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
    perform push_notification(p_user, 'level_up', null, null, null, '{"level":"platina"}');
  elsif before_pts < 40 and after_pts >= 40 then
    perform push_notification(p_user, 'level_up', null, null, null, '{"level":"ouro"}');
  elsif before_pts < 10 and after_pts >= 10 then
    perform push_notification(p_user, 'level_up', null, null, null, '{"level":"prata"}');
  end if;
  return true;
end $$;

-- Comentário atômico: grava e avisa menções, resposta, autor da oferta e inscritos (sem repetir pessoa).
create or replace function public.create_comment(
  p_deal uuid, p_user uuid, p_parent uuid, p_body text, p_mentions uuid[]
) returns uuid language plpgsql set search_path = public as $$
declare
  cid uuid; deal_owner uuid; parent_author uuid; root uuid; notified uuid[] := '{}'; s uuid; m uuid; auto_sub boolean;
begin
  select author_id into deal_owner from deals where id = p_deal and status in ('published', 'expired');
  if not found then raise exception 'deal not found'; end if;
  if p_parent is not null then
    select user_id, parent_id into parent_author, root from comments
    where id = p_parent and status = 'visible' and deal_id = p_deal;
    if not found then raise exception 'parent not found'; end if;
    if root is not null then p_parent := root; end if;
  end if;

  insert into comments (deal_id, user_id, parent_id, body) values (p_deal, p_user, p_parent, p_body) returning id into cid;

  foreach m in array coalesce(p_mentions, '{}') loop
    if m <> p_user and not (m = any (notified)) then
      perform push_notification(m, 'mention', p_user, p_deal, cid, '{}');
      notified := notified || m;
    end if;
  end loop;
  if parent_author is not null and parent_author <> p_user and not (parent_author = any (notified)) then
    perform push_notification(parent_author, 'reply', p_user, p_deal, cid, '{}');
    notified := notified || parent_author;
  end if;
  if deal_owner is not null and deal_owner <> p_user and not (deal_owner = any (notified)) then
    perform push_notification(deal_owner, 'comment', p_user, p_deal, cid, '{}');
    notified := notified || deal_owner;
  end if;
  for s in select user_id from deal_subscriptions where deal_id = p_deal and user_id <> p_user loop
    if not (s = any (notified)) then
      perform push_notification(s, 'subscribed_comment', p_user, p_deal, cid, '{}');
      notified := notified || s;
    end if;
  end loop;
  select coalesce((prefs ->> 'auto_subscribe')::boolean, true) into auto_sub from user_settings where user_id = p_user;
  if coalesce(auto_sub, true) then
    insert into deal_subscriptions (deal_id, user_id) values (p_deal, p_user) on conflict do nothing;
  end if;
  return cid;
end $$;

-- Reação: a mesma de novo remove; outra troca. Não vale reagir ao próprio comentário.
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
    perform push_notification(c.user_id, 'reaction', p_user, c.deal_id, p_comment, jsonb_build_object('reaction', p_kind));
  end if;
  if c.helpful_count >= 3 and c.user_id is not null then
    if award_points(c.user_id, 'helpful_comment', 10, p_comment::text, c.deal_id) then
      perform push_notification(c.user_id, 'helpful', null, c.deal_id, p_comment, '{}');
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
      perform push_notification(d.author_id, 'deal_expired', null, p_deal, null, '{}');
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

revoke execute on function public.push_notification(uuid, text, uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.award_points(uuid, text, integer, text, uuid) from public, anon, authenticated;
revoke execute on function public.create_comment(uuid, uuid, uuid, text, uuid[]) from public, anon, authenticated;
revoke execute on function public.react_comment(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.report_deal(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.report_comment(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.push_notification(uuid, text, uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.award_points(uuid, text, integer, text, uuid) to service_role;
grant execute on function public.create_comment(uuid, uuid, uuid, text, uuid[]) to service_role;
grant execute on function public.react_comment(uuid, uuid, text) to service_role;
grant execute on function public.report_deal(uuid, uuid, text, text) to service_role;
grant execute on function public.report_comment(uuid, uuid, text, text) to service_role;

alter table public.comment_reactions enable row level security;
alter table public.user_settings enable row level security;
alter table public.deal_subscriptions enable row level security;
alter table public.notifications enable row level security;
create policy own_read on public.user_settings for select using (user_id = (select auth.uid()));
create policy own_read on public.deal_subscriptions for select using (user_id = (select auth.uid()));
create policy own_read on public.notifications for select using (user_id = (select auth.uid()));

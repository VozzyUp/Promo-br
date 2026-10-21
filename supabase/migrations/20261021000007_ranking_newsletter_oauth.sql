-- promo-br: migração 7. Rodar no SQL Editor do Supabase (o Claude só consulta).
-- 1) Pesos do ranking editáveis no painel (site_settings, chave 'ranking.weights') + bônus de oferta impulsionada.
-- 2) Lista do boletim por e-mail.
-- 3) Cadastro com Google: o perfil ganha um usuário gerado quando não vem 'username' no cadastro.
-- É seguro rodar mais de uma vez.

-------------------------------------------------------------------------------
-- 1) Ranking
-------------------------------------------------------------------------------
create or replace function public.rank_weights() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.site_settings where key = 'ranking.weights'), '{}'::jsonb)
$$;
revoke execute on function public.rank_weights() from public, anon, authenticated;

create or replace view public.deals_ranked as
 select d.id, d.slug, d.code, d.title, d.description, d.author_id, d.source, d.store_id, d.category_id, d.listing_id,
        d.url_submitted, d.url_resolved, d.url_owner_affiliate, d.price_cents, d.list_price_cents, d.currency,
        d.shipping_note, d.coupon_code, d.coupon_percent, d.image_path, d.verdict, d.reference_price_cents,
        d.real_discount_bp, d.verified_at, d.status, d.reject_reason, d.published_at, d.expires_at, d.expired_reason,
        d.votes_up, d.votes_down, d.clicks_total, d.clicks_24h, d.conversions_total, d.comments_count, d.hot_score,
        d.boosted_until, d.is_sponsored, d.search, d.created_at, d.updated_at, d.expired_by, d.starts_at,
        d.availability, d.shipping_cents, d.ships_from, d.coupon_kind, d.coupon_amount_cents, d.url_key,
        (
          coalesce((w.v ->> 'discount')::numeric, 0.5) * coalesce(d.real_discount_bp, 0)::numeric / 100.0
          + coalesce((w.v ->> 'clicks')::numeric, 4) * ln((1 + d.clicks_24h)::numeric + d.clicks_total::numeric / 10.0)
          + coalesce((w.v ->> 'votes')::numeric, 1.5) * (d.votes_up - d.votes_down)::numeric
          + coalesce((w.v ->> 'verified')::numeric, 8) * (d.verdict = 'verified')::integer
          + coalesce((w.v ->> 'boost')::numeric, 30) * (d.boosted_until is not null and d.boosted_until > now())::integer
        ) / power(
          extract(epoch from now() - coalesce(d.published_at, d.created_at)) / 3600.0 + 2::numeric,
          coalesce((w.v ->> 'decay')::numeric, 1.5)
        ) as hot_now
   from public.deals d
  cross join (select public.rank_weights() as v) w;

-------------------------------------------------------------------------------
-- 2) Boletim
-------------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null default replace(gen_random_uuid()::text, '-', ''),   -- confirma e cancela sem login
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  user_id uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists newsletter_email_uq on public.newsletter_subscribers (lower(email));
create unique index if not exists newsletter_token_uq on public.newsletter_subscribers (token);
alter table public.newsletter_subscribers enable row level security;   -- sem políticas: só o servidor (service role) acessa

-------------------------------------------------------------------------------
-- 3) Perfil para cadastro sem 'username' (Google)
-------------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  uname text;
begin
  uname := lower(new.raw_user_meta_data ->> 'username');
  if uname is null then
    base := regexp_replace(lower(split_part(coalesce(new.email, 'membro'), '@', 1)), '[^a-z0-9_]', '', 'g');
    if length(base) < 3 then base := 'membro'; end if;
    uname := left(base, 17) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    uname,
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')), ''), uname)
  );
  return new;
end $$;

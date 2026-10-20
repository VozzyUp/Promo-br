-- promo-br: primeira migration (Supabase / Postgres 15+)
-- Convenções: uuid como id; timestamptz em UTC; dinheiro em centavos (integer) + currency;
-- descontos em pontos-base (1% = 100). Tabela única (sem multi-tenant).
-- Acesso: RLS ligado em tudo. O navegador só LÊ dados públicos (anon/authenticated).
-- Toda escrita passa por server actions/rotas do Next com a service role + checagem de papel no código.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- updated_at automático
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Configuração de busca em português sem acento
create text search configuration pt_unaccent (copy = portuguese);
alter text search configuration pt_unaccent
  alter mapping for hword, hword_part, word with unaccent, portuguese_stem;

-------------------------------------------------------------------------------
-- Pessoas
-------------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user','moderator','admin','system')),
  reputation integer not null default 0,
  trusted boolean not null default false,          -- publica sem passar pela fila
  approved_posts integer not null default 0,
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on profiles (reputation desc);
create trigger t_profiles_upd before update on profiles for each row execute function set_updated_at();

-------------------------------------------------------------------------------
-- Catálogo: lojas, categorias, produtos e anúncios de loja (listings)
-------------------------------------------------------------------------------
create table affiliate_networks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  deeplink_template text,                          -- ex.: https://rede/click?adv={advertiser}&url={url_encoded}
  integration_key text,                            -- aponta para integrations.key
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_networks_upd before update on affiliate_networks for each row execute function set_updated_at();

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  domains text[] not null default '{}',            -- amazon.com.br, amzn.to ...
  logo_url text,
  status text not null default 'active' check (status in ('active','pending_review','blocked')),
  link_mode text not null default 'direct'
    check (link_mode in ('direct_program','network','monetizer','direct')),
  affiliate_template text,                         -- usado só em posts do dono/robô
  network_id uuid references affiliate_networks(id) on delete set null,
  network_advertiser_id text,
  user_link_policy text not null default 'keep_author'
    check (user_link_policy in ('keep_author','split','replace','by_reputation')),
  split_owner_pct smallint not null default 0 check (split_owner_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on stores using gin (domains);
create index on stores (network_id);
create trigger t_stores_upd before update on stores for each row execute function set_updated_at();

create table blocked_domains (
  domain text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references categories(id) on delete restrict,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on categories (parent_id);
create trigger t_categories_upd before update on categories for each row execute function set_updated_at();

-- Produto "abstrato" que existe em várias lojas (unidade de comparação de preço)
create table products (
  id uuid primary key default gen_random_uuid(),
  ean text unique,                                  -- GTIN quando conhecido
  brand text,
  model text,
  variant text,                                     -- cor/capacidade/voltagem
  normalized_title text not null,
  category_id uuid references categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on products using gin (normalized_title gin_trgm_ops);
create index on products (category_id);
create trigger t_products_upd before update on products for each row execute function set_updated_at();

-- O produto numa loja específica
create table listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  store_id uuid not null references stores(id) on delete cascade,
  external_id text,                                 -- ASIN, itemId Shopee, MLB...
  canonical_url text not null,
  match_confidence numeric(4,3) check (match_confidence between 0 and 1),
  last_price_cents integer check (last_price_cents >= 0),
  currency char(3) not null default 'BRL',
  in_stock boolean,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, external_id)
);
create index on listings (product_id);
create index on listings (store_id);
create unique index listings_store_url on listings (store_id, md5(canonical_url));
create trigger t_listings_upd before update on listings for each row execute function set_updated_at();

create table price_snapshots (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings(id) on delete cascade,
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'BRL',
  in_stock boolean,
  source text not null check (source in ('robot','recheck','post','feed')),
  captured_at timestamptz not null default now()
);
create index on price_snapshots (listing_id, captured_at desc);

-------------------------------------------------------------------------------
-- Ofertas e cupons
-------------------------------------------------------------------------------
create table deals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  code text not null unique,                        -- usado em /ir/[code]
  title text not null check (char_length(title) between 10 and 140),
  description text not null default '',
  author_id uuid not null references profiles(id) on delete restrict,
  source text not null check (source in ('user','admin','robot')),
  store_id uuid not null references stores(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  url_submitted text not null,                      -- exatamente o que o autor colou (com a tag dele)
  url_resolved text,                                -- destino final após expandir encurtador (só leitura)
  url_owner_affiliate text,                         -- nosso link, quando a política/modo aplica
  price_cents integer not null check (price_cents >= 0),
  list_price_cents integer check (list_price_cents >= 0),   -- o "de" da loja (não entra no ranking)
  currency char(3) not null default 'BRL',
  shipping_note text,
  coupon_code text,
  image_path text,                                  -- Supabase Storage
  -- verificação
  verdict text not null default 'pending'
    check (verdict in ('pending','verified','good_price','no_comparison','inflated')),
  reference_price_cents integer,
  real_discount_bp integer,                         -- 1500 = 15%
  verified_at timestamptz,
  -- ciclo de vida
  status text not null default 'pending'
    check (status in ('pending','published','expired','rejected','removed')),
  reject_reason text,
  published_at timestamptz,
  expires_at timestamptz,
  expired_reason text,
  -- ranking (mantido pelo job rank_deals e pelos triggers de voto)
  votes_up integer not null default 0,
  votes_down integer not null default 0,
  clicks_total integer not null default 0,
  clicks_24h integer not null default 0,
  conversions_total integer not null default 0,
  comments_count integer not null default 0,
  hot_score double precision not null default 0,
  boosted_until timestamptz,
  is_sponsored boolean not null default false,
  search tsvector generated always as (
    setweight(to_tsvector('pt_unaccent', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('pt_unaccent', coalesce(description,'')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_time check (status <> 'published' or published_at is not null)
);
create index on deals (author_id, created_at desc);
create index on deals (store_id);
create index on deals (category_id);
create index on deals (listing_id);
create index deals_hot on deals (hot_score desc) where status = 'published';
create index deals_discount on deals (real_discount_bp desc) where status = 'published' and verdict in ('verified','good_price');
create index deals_new on deals (published_at desc) where status = 'published';
create index deals_pending on deals (created_at) where status = 'pending';
create index deals_search on deals using gin (search);
-- Duplicata: um anúncio de loja só pode ter uma oferta ativa por vez
create unique index deals_one_active_per_listing on deals (listing_id)
  where status in ('pending','published') and listing_id is not null;
create trigger t_deals_upd before update on deals for each row execute function set_updated_at();

create table verifications (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  verdict text not null check (verdict in ('verified','good_price','no_comparison','inflated')),
  price_cents integer not null,
  reference_price_cents integer,
  real_discount_bp integer,
  stores_compared smallint not null default 0,
  history_days smallint not null default 0,
  evidence jsonb not null default '{}',             -- [{store, price_cents, url, checked_at}], min30, mediana...
  created_at timestamptz not null default now()
);
create index on verifications (deal_id, created_at desc);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  code text not null,
  description text not null,
  min_order_cents integer,
  status text not null default 'pending' check (status in ('pending','published','expired','rejected')),
  expires_at timestamptz,
  verified_at timestamptz,
  worked_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on coupons (store_id, status);
create index on coupons (author_id);
create trigger t_coupons_upd before update on coupons for each row execute function set_updated_at();

-------------------------------------------------------------------------------
-- Comunidade
-------------------------------------------------------------------------------
create table votes (
  deal_id uuid not null references deals(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (deal_id, user_id)
);
create index on votes (user_id);

create table comments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on comments (deal_id, created_at);
create index on comments (user_id);
create index on comments (parent_id);
create trigger t_comments_upd before update on comments for each row execute function set_updated_at();

create table reports (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reporter_hash text not null,                      -- hash(ip+ua) para anônimo; dedup
  kind text not null check (kind in ('worked','price_changed','coupon_failed','out_of_stock','spam','offensive','fake')),
  note text,
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint report_target check ((deal_id is not null) <> (comment_id is not null))
);
create unique index reports_once on reports (coalesce(deal_id, comment_id), reporter_hash, kind);
create index on reports (deal_id, created_at desc);
create index on reports (comment_id);
create index on reports (reporter_id);
create index reports_open on reports (created_at) where resolved_at is null;

create table reputation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  kind text not null,                               -- post_approved, hot_100, inflated, report_upheld...
  points integer not null,
  created_at timestamptz not null default now()
);
create index on reputation_events (user_id, created_at desc);
create index on reputation_events (deal_id);

create table moderation_actions (
  id bigint generated always as identity primary key,
  moderator_id uuid references profiles(id) on delete set null,   -- null = sistema
  target_type text not null check (target_type in ('deal','comment','coupon','user','store')),
  target_id uuid not null,
  action text not null,                             -- approve, reject, expire, hide, ban, trust...
  reason text,
  created_at timestamptz not null default now()
);
create index on moderation_actions (target_type, target_id);
create index on moderation_actions (moderator_id);

create table alerts (                              -- pós-BF
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  keyword text not null,
  max_price_cents integer,
  category_id uuid references categories(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','push')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on alerts (user_id);
create index on alerts (category_id);
create trigger t_alerts_upd before update on alerts for each row execute function set_updated_at();

-------------------------------------------------------------------------------
-- Medição e dinheiro
-------------------------------------------------------------------------------
create table clicks (
  id bigint generated always as identity primary key,
  deal_id uuid not null references deals(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  visitor_hash text not null,                       -- hash(ip+ua+dia), sem guardar IP (LGPD)
  channel text not null default 'site' check (channel in ('site','telegram','whatsapp','instagram','other')),
  link_used text not null check (link_used in ('author','owner','direct')),
  sub_id text,
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);
create index on clicks (deal_id, created_at desc);
create index on clicks (user_id);
create index on clicks (created_at);
-- conta 1 clique por visitante/oferta/dia para o ranking (visitor_hash já inclui o dia)
create unique index clicks_unique_day on clicks (deal_id, visitor_hash) where is_bot = false;

create table conversions (
  id uuid primary key default gen_random_uuid(),
  network text not null,                            -- shopee, amazon, awin...
  order_ref text not null,
  sub_id text,
  deal_id uuid references deals(id) on delete set null,
  sale_cents integer not null default 0,
  commission_cents integer not null default 0,
  currency char(3) not null default 'BRL',
  status text not null check (status in ('pending','approved','cancelled','paid')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, order_ref)                       -- idempotência do sync
);
create index on conversions (deal_id);
create index on conversions (occurred_at desc);
create trigger t_conversions_upd before update on conversions for each row execute function set_updated_at();

create table boosts (                              -- pós-BF (Pix)
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete restrict,
  hours smallint not null check (hours > 0),
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'BRL',
  payment_provider text,
  payment_ref text unique,
  status text not null default 'pending' check (status in ('pending','paid','active','finished','refunded','failed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on boosts (deal_id);
create index on boosts (user_id);
create trigger t_boosts_upd before update on boosts for each row execute function set_updated_at();

-------------------------------------------------------------------------------
-- Configuração pelo painel e jobs
-------------------------------------------------------------------------------
create table site_settings (                       -- marca, SEO, textos legais, anúncios, pesos do ranking, limiares
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table integrations (                        -- credenciais SEMPRE criptografadas (AES-256-GCM com MASTER_KEY)
  key text primary key check (key in ('shopee','amazon','mercadolivre','awin','lomadee','rakuten','admitad',
                                       'telegram','uazapi','anthropic','adsense','smtp','pix')),
  enabled boolean not null default false,
  config_encrypted text,                            -- iv:tag:ciphertext (base64)
  public_config jsonb not null default '{}',        -- partes não secretas (ex.: tag da Amazon, id do canal)
  status text not null default 'untested' check (status in ('untested','ok','error')),
  last_error text,
  last_tested_at timestamptz,
  updated_at timestamptz not null default now()
);

create table ad_slots (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('feed','deal_top','deal_bottom','sidebar','store','category','search')),
  ad_unit text not null,                            -- data-ad-slot do AdSense
  every_n_items smallint,                           -- só para 'feed'
  min_height_px smallint not null default 250,      -- reserva espaço (sem CLS)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_ad_slots_upd before update on ad_slots for each row execute function set_updated_at();

create table robot_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null check (source in ('shopee','amazon','awin','lomadee','rakuten','admitad')),
  active boolean not null default false,
  cron text not null default '0 8,13,19 * * *',     -- America/Sao_Paulo
  category_id uuid references categories(id) on delete set null,
  keywords text[] not null default '{}',
  external_categories text[] not null default '{}',
  min_discount_bp integer not null default 1500,
  min_commission_bp integer not null default 0,
  max_price_cents integer,
  per_run smallint not null default 20,
  auto_publish boolean not null default false,      -- false = vai para a fila
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on robot_rules (category_id);
create trigger t_robot_rules_upd before update on robot_rules for each row execute function set_updated_at();

create table channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('telegram','whatsapp')),
  target text not null,                             -- @canal / chat_id / id do canal ou grupo
  active boolean not null default false,
  min_verdict text not null default 'verified' check (min_verdict in ('verified','good_price')),
  min_discount_bp integer not null default 2000,
  window_start time not null default '08:00',
  window_end time not null default '22:00',
  max_per_hour smallint not null default 6,
  template text not null,
  link_mode text not null default 'site' check (link_mode in ('site','direct')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_channels_upd before update on channels for each row execute function set_updated_at();

create table dispatches (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','skipped')),
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  external_message_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (deal_id, channel_id)                      -- nunca envia a mesma oferta 2x no mesmo canal
);
create index dispatches_due on dispatches (next_attempt_at) where status = 'queued';
create index on dispatches (channel_id);

create table job_runs (
  id bigint generated always as identity primary key,
  job text not null,                                -- robot:<rule_id>, recheck, rank, dispatch, sync:shopee, expire, cleanup
  trigger text not null default 'schedule' check (trigger in ('schedule','manual')),
  status text not null default 'running' check (status in ('running','ok','partial','error','skipped')),
  stats jsonb not null default '{}',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on job_runs (job, started_at desc);
create index on job_runs (started_at desc);

-------------------------------------------------------------------------------
-- Contadores de voto/comentário (consistência sem depender do app)
-------------------------------------------------------------------------------
create or replace function votes_counter() returns trigger language plpgsql as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    update deals set votes_up = votes_up - (old.value = 1)::int,
                     votes_down = votes_down - (old.value = -1)::int
    where id = old.deal_id;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    update deals set votes_up = votes_up + (new.value = 1)::int,
                     votes_down = votes_down + (new.value = -1)::int
    where id = new.deal_id;
  end if;
  return null;
end $$;
create trigger t_votes_counter after insert or update or delete on votes
  for each row execute function votes_counter();

create or replace function comments_counter() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then update deals set comments_count = comments_count + 1 where id = new.deal_id;
  elsif tg_op = 'DELETE' then update deals set comments_count = comments_count - 1 where id = old.deal_id;
  end if;
  return null;
end $$;
create trigger t_comments_counter after insert or delete on comments
  for each row execute function comments_counter();

-------------------------------------------------------------------------------
-- RLS: leitura pública do que está no ar; nenhuma escrita direta do navegador
-------------------------------------------------------------------------------
alter table profiles enable row level security;
alter table affiliate_networks enable row level security;
alter table stores enable row level security;
alter table blocked_domains enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table listings enable row level security;
alter table price_snapshots enable row level security;
alter table deals enable row level security;
alter table verifications enable row level security;
alter table coupons enable row level security;
alter table votes enable row level security;
alter table comments enable row level security;
alter table reports enable row level security;
alter table reputation_events enable row level security;
alter table moderation_actions enable row level security;
alter table alerts enable row level security;
alter table clicks enable row level security;
alter table conversions enable row level security;
alter table boosts enable row level security;
alter table site_settings enable row level security;
alter table integrations enable row level security;
alter table ad_slots enable row level security;
alter table robot_rules enable row level security;
alter table channels enable row level security;
alter table dispatches enable row level security;
alter table job_runs enable row level security;

create policy pub_read on profiles for select using (banned_at is null);
create policy pub_read on stores for select using (status = 'active');
create policy pub_read on categories for select using (true);
create policy pub_read on deals for select using (status in ('published','expired'));
create policy pub_read on verifications for select
  using (exists (select 1 from deals d where d.id = deal_id and d.status in ('published','expired')));
create policy pub_read on coupons for select using (status in ('published','expired'));
create policy pub_read on comments for select using (status = 'visible');
create policy own_read on votes for select using (user_id = auth.uid());
create policy own_read on alerts for select using (user_id = auth.uid());
create policy own_read on boosts for select using (user_id = auth.uid());
create policy own_read_deals on deals for select using (author_id = auth.uid());
create policy pub_read on ad_slots for select using (active);
-- site_settings: só chaves públicas (o app lê as privadas com a service role)
create policy pub_read on site_settings for select using (key like 'public.%');
-- Demais tabelas: sem policy = nenhum acesso por anon/authenticated (só service role).
-- Bucket de storage 'deal-images': leitura pública, upload só pelo servidor.

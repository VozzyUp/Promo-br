-- Fontes de captação: canais e grupos do Telegram que o robô lê para montar ofertas (sempre com link limpo, sem afiliado de terceiros).
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem problema.

-- Conta do Telegram (login) guardada criptografada na tabela de integrações.
alter table integrations drop constraint if exists integrations_key_check;
alter table integrations add constraint integrations_key_check check (key in (
  'shopee','amazon','mercadolivre','awin','lomadee','rakuten','admitad',
  'telegram','telegram_user','uazapi','anthropic','adsense','smtp','pix'));

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  kind text not null check (kind in ('telegram_public','telegram_account')),
  target text not null,                               -- @nome do canal público, ou o id do chat na conta logada
  target_title text,
  active boolean not null default true,
  cron text not null default '*/10 * * * *',          -- horário de Brasília
  category_id uuid references categories(id) on delete set null,
  min_discount_bp integer not null default 0 check (min_discount_bp between 0 and 9500),
  max_price_cents integer check (max_price_cents > 0),
  block_words text[] not null default '{}',
  per_run smallint not null default 15 check (per_run between 1 and 50),
  take_coupons boolean not null default true,
  auto_publish boolean not null default false,        -- false = vai para a fila de aprovação
  last_message_id bigint,                             -- última publicação já lida
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, target)
);
create index if not exists sources_category_idx on sources (category_id);
drop trigger if exists t_sources_upd on sources;
create trigger t_sources_upd before update on sources for each row execute function set_updated_at();

create table if not exists source_items (
  id bigint generated always as identity primary key,
  source_id uuid not null references sources(id) on delete cascade,
  message_id bigint not null,
  posted_at timestamptz,
  post_url text,                                      -- endereço da publicação original (quando existe)
  link text,                                          -- link como veio na publicação
  store_url text,                                     -- endereço da loja, já sem afiliado
  title text,
  price_cents integer,
  list_price_cents integer,
  coupon_code text,
  status text not null check (status in ('created','duplicate','filtered','no_store_link','error')),
  reason text,
  deal_id uuid references deals(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_id, message_id)
);
create index if not exists source_items_recent_idx on source_items (created_at desc);
create index if not exists source_items_deal_idx on source_items (deal_id);

alter table sources enable row level security;
alter table source_items enable row level security;
-- Sem políticas: só o servidor (chave de serviço) lê e escreve.

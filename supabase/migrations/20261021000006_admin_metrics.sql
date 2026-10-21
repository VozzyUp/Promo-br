-- Métricas do painel (A01): cliques, canais, melhores ofertas, lojas e vendas num único retorno.
create or replace function public.admin_metrics(p_days int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with c as (
    select cl.deal_id, cl.channel, cl.created_at, d.store_id
    from clicks cl join deals d on d.id = cl.deal_id
    where cl.is_bot = false and cl.created_at >= now() - make_interval(days => p_days)
  ),
  cv as (
    select v.*, d.store_id
    from conversions v left join deals d on d.id = v.deal_id
    where v.occurred_at >= now() - make_interval(days => p_days) and v.status <> 'cancelled'
  )
  select jsonb_build_object(
    'clicks_24h', (select count(*) from clicks where is_bot = false and created_at >= now() - interval '24 hours'),
    'clicks_7d', (select count(*) from clicks where is_bot = false and created_at >= now() - interval '7 days'),
    'clicks_period', (select count(*) from c),
    'by_channel', (select coalesce(jsonb_object_agg(channel, n), '{}'::jsonb) from (select channel, count(*) n from c group by channel) x),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', n) order by day), '[]'::jsonb)
               from (select (created_at at time zone 'America/Sao_Paulo')::date as day, count(*) n from c group by 1) x),
    'top_deals', (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
                  from (select d.slug, d.title, count(*) n from c join deals d on d.id = c.deal_id group by d.slug, d.title order by n desc limit 10) x),
    'by_store', (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
                 from (select s.name, count(c.deal_id) as clicks,
                              (select count(*) from cv where cv.store_id = s.id) as sales,
                              (select coalesce(sum(commission_cents), 0) from cv where cv.store_id = s.id) as commission_cents
                       from stores s left join c on c.store_id = s.id
                       group by s.id, s.name having count(c.deal_id) > 0 order by clicks desc) x),
    'conv', (select jsonb_build_object('count', count(*), 'sale_cents', coalesce(sum(sale_cents), 0),
                    'commission_cents', coalesce(sum(commission_cents), 0),
                    'pending_cents', coalesce(sum(commission_cents) filter (where status = 'pending'), 0)) from cv)
  );
$$;
revoke all on function public.admin_metrics(int) from public, anon, authenticated;
grant execute on function public.admin_metrics(int) to service_role;
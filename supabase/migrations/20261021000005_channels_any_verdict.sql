-- Canais: permite enviar ofertas sem selo (produtos novos do robô ainda não têm histórico).
alter table public.channels drop constraint channels_min_verdict_check;
alter table public.channels add constraint channels_min_verdict_check check (min_verdict in ('any','verified','good_price'));
alter table public.channels alter column min_verdict set default 'any';

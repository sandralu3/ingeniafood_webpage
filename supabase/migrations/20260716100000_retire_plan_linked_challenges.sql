-- Retos 3 (vegetales) y 6 (proteína en desayuno) pasan al bloque "Plan de hoy".
delete from public.retos_hoy_activos
where reto_id in ('3', '6');

comment on table public.retos_hoy_activos is
  'Retos activos en la pantalla Hoy. Los retos 3 y 6 fueron retirados: vegetales y proteína del desayuno se calculan desde el plan semanal.';

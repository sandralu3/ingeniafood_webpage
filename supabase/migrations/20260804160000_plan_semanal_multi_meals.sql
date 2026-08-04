-- Permitir varias recetas por (día + tipo de comida).
-- Antes: una sola fila por slot → ahora N filas ordenadas.

alter table public.plan_semanal
  drop constraint if exists plan_semanal_slot_unique;

alter table public.plan_semanal
  add column if not exists orden integer not null default 0;

comment on column public.plan_semanal.orden is
  'Orden de visualización dentro del mismo día y tipo de comida (0 = primero).';

comment on table public.plan_semanal is
  'Comidas asignadas por día y tipo. Puede haber varias filas por desayuno/almuerzo/cena.';

create index if not exists plan_semanal_slot_orden_idx
  on public.plan_semanal (user_id, semana_inicio, dia_semana, tipo_comida, orden);

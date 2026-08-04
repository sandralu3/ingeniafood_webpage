-- Días de la semana en que un reto activo aparece en Hoy.
-- Por defecto: todos los días (compatibilidad con retos ya activos).

alter table public.retos_hoy_activos
  add column if not exists dias_semana text[] not null
  default array[
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo'
  ]::text[];

alter table public.retos_hoy_activos
  drop constraint if exists retos_hoy_activos_dias_semana_nonempty;

alter table public.retos_hoy_activos
  add constraint retos_hoy_activos_dias_semana_nonempty
  check (cardinality(dias_semana) >= 1);

comment on column public.retos_hoy_activos.dias_semana is
  'Días de la semana (Lunes…Domingo) en los que el reto aparece en Hoy. Al menos 1.';

comment on table public.retos_hoy_activos is
  'Retos activos por usuario. dias_semana define en qué días se muestran en Hoy.';

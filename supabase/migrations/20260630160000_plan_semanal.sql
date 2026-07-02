-- Planificador semanal por usuario
create table if not exists public.plan_semanal (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  semana_inicio date        not null,
  dia_semana    text        not null check (
    dia_semana in (
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    )
  ),
  tipo_comida   text        not null check (
    tipo_comida in ('Desayuno', 'Almuerzo', 'Cena')
  ),
  recipe_id     uuid        not null references public.recipes (id) on delete cascade,
  created_at    timestamptz not null default now(),
  constraint plan_semanal_slot_unique unique (user_id, semana_inicio, dia_semana, tipo_comida)
);

create index if not exists plan_semanal_user_week_idx
  on public.plan_semanal (user_id, semana_inicio);

create index if not exists plan_semanal_recipe_id_idx
  on public.plan_semanal (recipe_id);

comment on table public.plan_semanal is
  'Comidas asignadas por día y tipo para el plan semanal de cada usuario.';
comment on column public.plan_semanal.semana_inicio is
  'Lunes de la semana a la que pertenece la entrada del plan (ISO week anchor).';

alter table public.plan_semanal enable row level security;

drop policy if exists "users read own weekly plan" on public.plan_semanal;
create policy "users read own weekly plan"
  on public.plan_semanal for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own weekly plan" on public.plan_semanal;
create policy "users insert own weekly plan"
  on public.plan_semanal for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own weekly plan" on public.plan_semanal;
create policy "users update own weekly plan"
  on public.plan_semanal for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own weekly plan" on public.plan_semanal;
create policy "users delete own weekly plan"
  on public.plan_semanal for delete
  to authenticated
  using (auth.uid() = user_id);

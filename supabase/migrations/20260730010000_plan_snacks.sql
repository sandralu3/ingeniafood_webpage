-- Snacks / tentempiés del plan (varios por día; no ocupan slot de comida principal)
create table if not exists public.plan_snacks (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  semana_inicio    date        not null,
  dia_semana       text        not null check (
    dia_semana in (
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    )
  ),
  title            text        not null,
  kcal             integer     not null default 0 check (kcal >= 0),
  proteinas_g      integer     not null default 0 check (proteinas_g >= 0),
  carbohidratos_g  integer     not null default 0 check (carbohidratos_g >= 0),
  grasas_g         integer     not null default 0 check (grasas_g >= 0),
  image_url        text        null,
  source           text        not null default 'quick' check (
    source in ('text', 'photo', 'quick')
  ),
  emoji            text        null,
  created_at       timestamptz not null default now()
);

create index if not exists plan_snacks_user_week_idx
  on public.plan_snacks (user_id, semana_inicio);

create index if not exists plan_snacks_user_day_idx
  on public.plan_snacks (user_id, semana_inicio, dia_semana);

comment on table public.plan_snacks is
  'Snacks / tentempiés registrados por día en el plan semanal (varios por día).';

alter table public.plan_snacks enable row level security;

drop policy if exists "users read own plan snacks" on public.plan_snacks;
create policy "users read own plan snacks"
  on public.plan_snacks for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own plan snacks" on public.plan_snacks;
create policy "users insert own plan snacks"
  on public.plan_snacks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own plan snacks" on public.plan_snacks;
create policy "users update own plan snacks"
  on public.plan_snacks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own plan snacks" on public.plan_snacks;
create policy "users delete own plan snacks"
  on public.plan_snacks for delete
  to authenticated
  using (auth.uid() = user_id);

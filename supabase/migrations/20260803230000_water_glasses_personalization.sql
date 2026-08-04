-- Hidratación personalizable: meta de vasos en perfil + progreso diario.
-- Sustituye el reto fijo del sistema "Beber 2 L de agua" (reto_id = '1').

alter table public.profiles
  add column if not exists water_glasses_goal integer;

alter table public.profiles
  drop constraint if exists profiles_water_glasses_goal_check;

alter table public.profiles
  add constraint profiles_water_glasses_goal_check
  check (
    water_glasses_goal is null
    or (water_glasses_goal >= 1 and water_glasses_goal <= 16)
  );

comment on column public.profiles.water_glasses_goal is
  'Meta diaria de vasos de agua (1-16). NULL = no mostrar tracker en Hoy.';

create table if not exists public.water_intake_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  intake_date date not null default ((timezone('utc', now()))::date),
  glasses_drunk integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, intake_date)
);

alter table public.water_intake_daily
  drop constraint if exists water_intake_daily_glasses_drunk_check;

alter table public.water_intake_daily
  add constraint water_intake_daily_glasses_drunk_check
  check (glasses_drunk >= 0 and glasses_drunk <= 16);

comment on table public.water_intake_daily is
  'Progreso diario de vasos de agua tomados por el usuario.';

create index if not exists water_intake_daily_user_date_idx
  on public.water_intake_daily (user_id, intake_date desc);

alter table public.water_intake_daily enable row level security;

drop policy if exists "users can select own water intake" on public.water_intake_daily;
create policy "users can select own water intake"
  on public.water_intake_daily
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own water intake" on public.water_intake_daily;
create policy "users can insert own water intake"
  on public.water_intake_daily
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own water intake" on public.water_intake_daily;
create policy "users can update own water intake"
  on public.water_intake_daily
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete own water intake" on public.water_intake_daily;
create policy "users can delete own water intake"
  on public.water_intake_daily
  for delete
  using (auth.uid() = user_id);

-- Retirar el reto fijo de agua del catálogo activo en Hoy.
delete from public.retos_hoy_activos
where reto_id = '1';

comment on table public.retos_hoy_activos is
  'Retos activos en la pantalla Hoy. El reto 1 (agua) se retiró: la hidratación es un parámetro personalizable (profiles.water_glasses_goal).';

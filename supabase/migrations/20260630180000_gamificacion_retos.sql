-- Gamificación: retos diarios completados por usuario
create table if not exists public.retos_usuarios (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  reto_id       text        not null check (char_length(trim(reto_id)) > 0),
  completado_at date        not null default (timezone('utc', now()))::date,
  created_at    timestamptz not null default now(),
  constraint retos_usuarios_user_reto_day_unique unique (user_id, reto_id, completado_at)
);

create index if not exists retos_usuarios_user_day_idx
  on public.retos_usuarios (user_id, completado_at desc);

comment on table public.retos_usuarios is
  'Retos diarios marcados como completados por cada usuario.';

alter table public.retos_usuarios enable row level security;

drop policy if exists "users read own daily challenges" on public.retos_usuarios;
create policy "users read own daily challenges"
  on public.retos_usuarios for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own daily challenges" on public.retos_usuarios;
create policy "users insert own daily challenges"
  on public.retos_usuarios for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users delete own daily challenges" on public.retos_usuarios;
create policy "users delete own daily challenges"
  on public.retos_usuarios for delete
  to authenticated
  using (auth.uid() = user_id);

-- Score acumulado de gamificación en el perfil
alter table public.profiles
  add column if not exists health_score integer not null default 0
  check (health_score >= 0);

comment on column public.profiles.health_score is
  'Puntos acumulados por retos y hábitos saludables (gamificación).';

-- Metas personalizadas creadas por cada usuario
create table if not exists public.retos_personalizados (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  titulo     text        not null check (char_length(trim(titulo)) > 0),
  puntos     integer     not null default 10 check (puntos > 0),
  created_at timestamptz not null default now()
);

create index if not exists retos_personalizados_user_idx
  on public.retos_personalizados (user_id, created_at desc);

comment on table public.retos_personalizados is
  'Metas saludables personalizadas definidas por cada usuario.';

alter table public.retos_personalizados enable row level security;

drop policy if exists "users read own custom challenges" on public.retos_personalizados;
create policy "users read own custom challenges"
  on public.retos_personalizados for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own custom challenges" on public.retos_personalizados;
create policy "users insert own custom challenges"
  on public.retos_personalizados for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own custom challenges" on public.retos_personalizados;
create policy "users update own custom challenges"
  on public.retos_personalizados for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own custom challenges" on public.retos_personalizados;
create policy "users delete own custom challenges"
  on public.retos_personalizados for delete
  to authenticated
  using (auth.uid() = user_id);

-- Completados diarios (sistema + personalizados)
create table if not exists public.retos_completados_diarios (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  reto_id       text        not null check (char_length(trim(reto_id)) > 0),
  completado_at date        not null default (timezone('utc', now()))::date,
  created_at    timestamptz not null default now(),
  constraint retos_completados_diarios_user_reto_day_unique
    unique (user_id, reto_id, completado_at)
);

create index if not exists retos_completados_diarios_user_day_idx
  on public.retos_completados_diarios (user_id, completado_at desc);

comment on table public.retos_completados_diarios is
  'Retos del sistema o personalizados marcados como completados en un día concreto.';

alter table public.retos_completados_diarios enable row level security;

drop policy if exists "users read own daily completions" on public.retos_completados_diarios;
create policy "users read own daily completions"
  on public.retos_completados_diarios for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own daily completions" on public.retos_completados_diarios;
create policy "users insert own daily completions"
  on public.retos_completados_diarios for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users delete own daily completions" on public.retos_completados_diarios;
create policy "users delete own daily completions"
  on public.retos_completados_diarios for delete
  to authenticated
  using (auth.uid() = user_id);

-- Migrar datos históricos si existían en retos_usuarios
insert into public.retos_completados_diarios (user_id, reto_id, completado_at, created_at)
select user_id, reto_id, completado_at, created_at
from public.retos_usuarios
on conflict (user_id, reto_id, completado_at) do nothing;

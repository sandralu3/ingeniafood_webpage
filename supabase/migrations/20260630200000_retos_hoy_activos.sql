-- Retos que el usuario ha elegido mostrar en la pantalla "Hoy"
create table if not exists public.retos_hoy_activos (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  reto_id    text        not null check (char_length(trim(reto_id)) > 0),
  created_at timestamptz not null default now(),
  constraint retos_hoy_activos_user_reto_unique unique (user_id, reto_id)
);

create index if not exists retos_hoy_activos_user_idx
  on public.retos_hoy_activos (user_id);

comment on table public.retos_hoy_activos is
  'Retos del sistema o personalizados que el usuario quiere ver en el módulo Hoy.';

alter table public.retos_hoy_activos enable row level security;

drop policy if exists "users read own active challenges" on public.retos_hoy_activos;
create policy "users read own active challenges"
  on public.retos_hoy_activos for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own active challenges" on public.retos_hoy_activos;
create policy "users insert own active challenges"
  on public.retos_hoy_activos for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users delete own active challenges" on public.retos_hoy_activos;
create policy "users delete own active challenges"
  on public.retos_hoy_activos for delete
  to authenticated
  using (auth.uid() = user_id);

-- Alinea user_pantry_favorites con el esquema esperado por la app (ingredient_id uuid FK).
-- Necesario si la tabla ya existía antes con otras columnas.

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
  ) then
    create table public.user_pantry_favorites (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references public.profiles (id) on delete cascade,
      ingredient_id uuid not null references public.master_ingredients (id) on delete cascade,
      created_at timestamptz not null default now(),
      constraint user_pantry_favorites_user_ingredient_unique unique (user_id, ingredient_id)
    );
    return;
  end if;

  -- Renombrar variantes comunes del nombre de columna
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'master_ingredient_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'ingredient_id'
  ) then
    alter table public.user_pantry_favorites
      rename column master_ingredient_id to ingredient_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'ingredient_uuid'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'ingredient_id'
  ) then
    alter table public.user_pantry_favorites
      rename column ingredient_uuid to ingredient_id;
  end if;

  -- Añadir ingredient_id si sigue faltando
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'ingredient_id'
  ) then
    alter table public.user_pantry_favorites
      add column ingredient_id uuid;
  end if;

  -- Backfill desde ingredient_name legacy (si existe)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'ingredient_name'
  ) and exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'master_ingredients'
  ) then
    update public.user_pantry_favorites upf
    set ingredient_id = mi.id
    from public.master_ingredients mi
    where upf.ingredient_id is null
      and lower(trim(upf.ingredient_name)) = lower(trim(mi.name));
  end if;

  -- Añadir id si la tabla legacy no lo tenía
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'id'
  ) then
    alter table public.user_pantry_favorites
      add column id uuid default gen_random_uuid();
    update public.user_pantry_favorites set id = gen_random_uuid() where id is null;
    alter table public.user_pantry_favorites alter column id set not null;
  end if;

  -- Añadir created_at si falta
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_pantry_favorites'
      and column_name = 'created_at'
  ) then
    alter table public.user_pantry_favorites
      add column created_at timestamptz not null default now();
  end if;
end $$;

-- FK + NOT NULL (solo si master_ingredients existe)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'master_ingredients'
  ) then
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_pantry_favorites_ingredient_id_fkey'
  ) then
    alter table public.user_pantry_favorites
      add constraint user_pantry_favorites_ingredient_id_fkey
      foreign key (ingredient_id)
      references public.master_ingredients (id)
      on delete cascade;
  end if;
  end if;
end $$;

-- Eliminar filas huérfanas antes de forzar NOT NULL
delete from public.user_pantry_favorites where ingredient_id is null;

alter table public.user_pantry_favorites
  alter column ingredient_id set not null;

create unique index if not exists user_pantry_favorites_user_ingredient_uidx
  on public.user_pantry_favorites (user_id, ingredient_id);

create index if not exists user_pantry_favorites_user_id_idx
  on public.user_pantry_favorites (user_id);

alter table public.user_pantry_favorites enable row level security;

drop policy if exists "users read own pantry favorites" on public.user_pantry_favorites;
create policy "users read own pantry favorites"
on public.user_pantry_favorites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users insert own pantry favorites" on public.user_pantry_favorites;
create policy "users insert own pantry favorites"
on public.user_pantry_favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users delete own pantry favorites" on public.user_pantry_favorites;
create policy "users delete own pantry favorites"
on public.user_pantry_favorites
for delete
to authenticated
using (auth.uid() = user_id);

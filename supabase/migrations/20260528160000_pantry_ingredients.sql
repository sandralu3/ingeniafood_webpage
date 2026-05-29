-- Master catalog + per-user pantry favorites
create table if not exists public.master_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('proteinas', 'vegetales', 'basicos_despensa')),
  created_at timestamptz not null default now(),
  constraint master_ingredients_name_unique unique (name)
);

create index if not exists master_ingredients_category_idx
  on public.master_ingredients (category);

create index if not exists master_ingredients_name_lower_idx
  on public.master_ingredients (lower(name));

create table if not exists public.user_pantry_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ingredient_id uuid not null references public.master_ingredients (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_pantry_favorites_user_ingredient_unique unique (user_id, ingredient_id)
);

create index if not exists user_pantry_favorites_user_id_idx
  on public.user_pantry_favorites (user_id);

alter table public.master_ingredients enable row level security;
alter table public.user_pantry_favorites enable row level security;

drop policy if exists "master ingredients readable by authenticated" on public.master_ingredients;
create policy "master ingredients readable by authenticated"
on public.master_ingredients
for select
to authenticated
using (true);

drop policy if exists "authenticated users can insert master ingredients" on public.master_ingredients;
create policy "authenticated users can insert master ingredients"
on public.master_ingredients
for insert
to authenticated
with check (char_length(trim(name)) >= 3);

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

insert into public.master_ingredients (name, category) values
  ('Filete de Salmon', 'proteinas'),
  ('Tofu', 'proteinas'),
  ('Frijoles Negros', 'proteinas'),
  ('Pechuga de Pollo', 'proteinas'),
  ('Huevo', 'proteinas'),
  ('Atun en lata', 'proteinas'),
  ('Tomates Cherry', 'vegetales'),
  ('Brocoli', 'vegetales'),
  ('Pimientos', 'vegetales'),
  ('Espinaca', 'vegetales'),
  ('Kale', 'vegetales'),
  ('Zanahoria', 'vegetales'),
  ('Aceite de Oliva', 'basicos_despensa'),
  ('Arroz Integral', 'basicos_despensa'),
  ('Miel', 'basicos_despensa'),
  ('Quinoa', 'basicos_despensa'),
  ('Yogur griego', 'basicos_despensa'),
  ('Avena', 'basicos_despensa'),
  ('Sal', 'basicos_despensa'),
  ('Pimienta', 'basicos_despensa')
on conflict (name) do nothing;

-- Sandra Vergara | Cocina Inteligente
-- Supabase schema + RLS policies

-- Extensions
create extension if not exists "pgcrypto";

-- Public profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'User profile data linked to auth.users.';
comment on column public.profiles.is_premium is 'Premium subscription flag for advanced healthy cooking features.';

-- Recipes created by users
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text not null,
  cooking_time integer check (cooking_time is null or cooking_time > 0),
  image_url text,
  is_airfryer boolean not null default false,
  is_flourless boolean not null default false,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.recipes is 'Healthy and fast cooking recipes created by users.';
comment on column public.recipes.ingredients is 'JSONB array for flexible ingredient lists and quantities.';
comment on column public.recipes.is_airfryer is 'Tag flag for Airfryer recipes.';
comment on column public.recipes.is_flourless is 'Tag flag for Sin Harinas recipes.';

create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists recipes_public_created_idx on public.recipes (is_public, created_at desc);
create index if not exists recipes_airfryer_idx on public.recipes (is_airfryer) where is_airfryer = true;
create index if not exists recipes_flourless_idx on public.recipes (is_flourless) where is_flourless = true;
create index if not exists recipes_ingredients_gin_idx on public.recipes using gin (ingredients);

-- Favorites pivot table
create table if not exists public.saved_recipes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

comment on table public.saved_recipes is 'User favorite recipes.';

create index if not exists saved_recipes_recipe_id_idx on public.saved_recipes (recipe_id);

-- Optional trigger to auto-create profile when auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.saved_recipes enable row level security;

-- Profiles policies
drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
on public.profiles
for select
to authenticated, anon
using (true);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- Recipes policies
drop policy if exists "public recipes are readable by everyone" on public.recipes;
create policy "public recipes are readable by everyone"
on public.recipes
for select
to authenticated, anon
using (is_public = true or auth.uid() = user_id);

drop policy if exists "users can create own recipes" on public.recipes;
create policy "users can create own recipes"
on public.recipes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own recipes" on public.recipes;
create policy "users can update own recipes"
on public.recipes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own recipes" on public.recipes;
create policy "users can delete own recipes"
on public.recipes
for delete
to authenticated
using (auth.uid() = user_id);

-- Saved recipes policies
drop policy if exists "users can read own saved recipes" on public.saved_recipes;
create policy "users can read own saved recipes"
on public.saved_recipes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can save recipes for themselves" on public.saved_recipes;
create policy "users can save recipes for themselves"
on public.saved_recipes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can unsave own recipes" on public.saved_recipes;
create policy "users can unsave own recipes"
on public.saved_recipes
for delete
to authenticated
using (auth.uid() = user_id);

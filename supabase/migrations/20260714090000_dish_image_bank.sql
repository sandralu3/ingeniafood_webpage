-- Banco de imágenes de platos para matching Premium (Fase 1: reglas)
create table if not exists public.dish_image_bank (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text not null,
  meal_types text[] not null default '{}',
  cuisine_styles text[] not null default '{}',
  keywords text[] not null default '{}',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dish_image_bank_active_idx
  on public.dish_image_bank (is_active)
  where is_active = true;

alter table public.dish_image_bank enable row level security;

drop policy if exists "active dish images are readable" on public.dish_image_bank;
create policy "active dish images are readable"
  on public.dish_image_bank
  for select
  using (is_active = true);

drop policy if exists "sandra admin manages dish image bank" on public.dish_image_bank;
create policy "sandra admin manages dish image bank"
  on public.dish_image_bank
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'sandralu317@hotmail.com')
  with check ((auth.jwt() ->> 'email') = 'sandralu317@hotmail.com');

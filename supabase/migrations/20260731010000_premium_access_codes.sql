-- Acceso Premium temporal por código (24h) + foto real 1x lifetime.

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'tester', 'user'));

alter table public.profiles
  add column if not exists premium_expires_at timestamptz;

alter table public.profiles
  add column if not exists has_generated_real_photo boolean not null default false;

alter table public.profiles
  add column if not exists redeemed_code text;

comment on column public.profiles.role is
  'admin | tester | user. admin/tester = Premium permanente.';
comment on column public.profiles.premium_expires_at is
  'Fin del Premium temporal por código. Null = sin acceso temporal.';
comment on column public.profiles.has_generated_real_photo is
  'True tras la única foto real de prueba (lifetime). Stripe paid = ilimitado.';
comment on column public.profiles.redeemed_code is
  'Último código de acceso Premium canjeado.';

-- Sincronizar role desde is_tester existente.
update public.profiles
set role = 'tester'
where is_tester = true
  and role = 'user';

-- Quienes ya consumieron el crédito de foto (legacy) marcan el flag lifetime.
update public.profiles
set has_generated_real_photo = true
where coalesce(openai_photo_credits, 0) = 0
  and is_tester = true;

create table if not exists public.premium_access_codes (
  code text primary key,
  label text,
  duration_hours integer not null default 24
    check (duration_hours > 0 and duration_hours <= 720),
  max_redemptions integer
    check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0
    check (redemption_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.premium_access_codes is
  'Códigos de acceso Premium temporal (p. ej. 24h en beta).';

create table if not exists public.premium_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null references public.premium_access_codes (code) on delete restrict,
  redeemed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, code)
);

create index if not exists premium_code_redemptions_user_id_idx
  on public.premium_code_redemptions (user_id);

alter table public.premium_access_codes enable row level security;
alter table public.premium_code_redemptions enable row level security;

-- Lectura de códigos: solo service role (API admin). Sin políticas = denegado a clients.
-- Redenciones: el usuario puede ver las suyas.
drop policy if exists "Users read own premium code redemptions"
  on public.premium_code_redemptions;
create policy "Users read own premium code redemptions"
  on public.premium_code_redemptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Códigos de arranque beta (idempotente).
insert into public.premium_access_codes (code, label, duration_hours, max_redemptions, is_active)
values
  ('INGENIA24', 'Beta 24h', 24, null, true),
  ('SANDRA24', 'Invitación Sandra 24h', 24, null, true),
  ('BETAFOOD', 'Beta foodies 24h', 24, 500, true)
on conflict (code) do nothing;

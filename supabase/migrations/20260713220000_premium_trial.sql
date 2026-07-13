-- Prueba Premium de un solo uso (simular upgrade sin is_premium permanente).

alter table if exists public.profiles
  add column if not exists premium_trial_remaining integer not null default 0
    check (premium_trial_remaining >= 0 and premium_trial_remaining <= 1);

alter table if exists public.profiles
  add column if not exists premium_trial_claimed_at timestamptz null;

comment on column public.profiles.premium_trial_remaining is
  'Usos restantes de funciones Premium en prueba gratuita (0 o 1).';

comment on column public.profiles.premium_trial_claimed_at is
  'Marca de tiempo en que el usuario reclamó su única prueba Premium simulada.';

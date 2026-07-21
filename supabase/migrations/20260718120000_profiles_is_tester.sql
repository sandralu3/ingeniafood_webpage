-- Testers beta: únicos con acceso a Premium / Stripe / foto OpenAI.
alter table public.profiles
  add column if not exists is_tester boolean not null default false;

comment on column public.profiles.is_tester is
  'Si es true, el usuario puede ver y usar Premium, Stripe y flujos de evaluación. Usuarios normales: false.';

create index if not exists profiles_is_tester_idx
  on public.profiles (is_tester)
  where is_tester = true;

-- Preferencia de idioma de la interfaz (next-intl).
-- Valores esperados: 'es' | 'en' (+ futuros como 'pt').

alter table if exists public.profiles
  add column if not exists language varchar(8) not null default 'es';

comment on column public.profiles.language is
  'Idioma de interfaz preferido del usuario (es, en, pt, ...).';

alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (language in ('es', 'en', 'pt'));

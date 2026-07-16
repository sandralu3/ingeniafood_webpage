-- Idioma del tip del día (next-intl). Valores: 'es' | 'en' (+ futuros).

alter table if exists public.tips_saludables
  add column if not exists language varchar(8) not null default 'es';

comment on column public.tips_saludables.language is
  'Idioma del tip (es, en, ...). Filtrado por la preferencia del usuario.';

alter table public.tips_saludables
  drop constraint if exists tips_saludables_language_check;

alter table public.tips_saludables
  add constraint tips_saludables_language_check
  check (language in ('es', 'en', 'pt'));

create index if not exists tips_saludables_language_idx
  on public.tips_saludables (language);

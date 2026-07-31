-- Promo de referido reclamable manualmente (24h) desde HOY.

alter table public.profiles
  add column if not exists has_promo_claimable boolean not null default false;

alter table public.profiles
  add column if not exists promo_code_ref text;

comment on column public.profiles.has_promo_claimable is
  'True si el usuario tiene 24h Premium pendientes de activar (llegó por ?ref=).';
comment on column public.profiles.promo_code_ref is
  'Código/origen del link de referido (?ref=) que otorgó la promo reclamable.';

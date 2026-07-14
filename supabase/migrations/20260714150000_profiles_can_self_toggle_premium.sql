-- Permite que usuarios seleccionados por admin activen/desactiven Premium desde su perfil (pruebas beta).
alter table public.profiles
  add column if not exists can_self_toggle_premium boolean not null default false;

comment on column public.profiles.can_self_toggle_premium is
  'Si es true, el usuario puede activar/desactivar is_premium desde su perfil (solo para testers autorizados por admin).';

create index if not exists profiles_can_self_toggle_premium_idx
  on public.profiles (can_self_toggle_premium)
  where can_self_toggle_premium = true;

-- Bienvenida: nuevos usuarios reciben pase Premium 24h pendiente de activar en HOY.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    generations_left,
    daily_scan_limit,
    scans_used_today,
    scan_quota_date,
    has_promo_claimable,
    promo_code_ref
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    5,
    5,
    0,
    current_date,
    true,
    'WELCOME'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crea perfil al registrarse y deja has_promo_claimable=true (pase 24h WELCOME) para activar en HOY.';

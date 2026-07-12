-- Reparar usuarios huérfanos: existen en auth.users pero no en public.profiles.
-- Usa los mismos defaults que handle_new_user().

create or replace function public.repair_orphan_profiles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  with inserted as (
    insert into public.profiles (
      id,
      full_name,
      avatar_url,
      generations_left,
      daily_scan_limit,
      scans_used_today,
      scan_quota_date
    )
    select
      u.id,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
      u.raw_user_meta_data->>'avatar_url',
      5,
      5,
      0,
      current_date
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
    on conflict (id) do nothing
    returning id
  )
  select count(*)::integer into inserted_count from inserted;

  return inserted_count;
end;
$$;

comment on function public.repair_orphan_profiles() is
  'Crea filas en public.profiles para usuarios de auth.users que no tienen perfil. Devuelve cuántos perfiles se insertaron.';

revoke all on function public.repair_orphan_profiles() from public;
revoke all on function public.repair_orphan_profiles() from anon, authenticated;
grant execute on function public.repair_orphan_profiles() to service_role;

-- Ejecutar una vez al aplicar la migración.
select public.repair_orphan_profiles();

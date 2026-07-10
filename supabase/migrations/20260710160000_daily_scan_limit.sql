-- Límite diario de escaneos configurable por usuario (admin)
alter table public.profiles
  add column if not exists daily_scan_limit integer not null default 5
  check (daily_scan_limit >= 0);

alter table public.profiles
  add column if not exists scans_used_today integer not null default 0
  check (scans_used_today >= 0);

alter table public.profiles
  add column if not exists scan_quota_date date not null default current_date;

comment on column public.profiles.daily_scan_limit is
  'Máximo de escaneos con IA permitidos por día para este usuario.';

comment on column public.profiles.scans_used_today is
  'Escaneos consumidos en la fecha indicada por scan_quota_date.';

comment on column public.profiles.scan_quota_date is
  'Fecha (día calendario) a la que aplica scans_used_today.';

-- Migrar el límite histórico de generations_left como referencia inicial
update public.profiles
set daily_scan_limit = greatest(coalesce(generations_left, 5), 5)
where daily_scan_limit = 5
  and generations_left is not null
  and generations_left > 5;

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
    scan_quota_date
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    5,
    5,
    0,
    current_date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

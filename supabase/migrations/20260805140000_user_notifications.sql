-- Centro de notificaciones in-app + last_seen para reenganche.

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

comment on column public.profiles.last_seen_at is
  'Última vez que la app sincronizó notificaciones / sesión activa del usuario.';

create table if not exists public.user_notifications (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  type          text        not null,
  title         text        not null,
  body          text        not null,
  href          text,
  dedupe_key    text        not null,
  payload       jsonb       not null default '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint user_notifications_type_check check (
    type in (
      'streak_at_risk',
      'reengagement',
      'sandra_tip',
      'empty_meal_slot',
      'water_midday',
      'instagram_catalog',
      'promo_claimable',
      'app_update',
      'admin_new_user',
      'admin_catalog_published'
    )
  ),
  constraint user_notifications_user_dedupe_unique unique (user_id, dedupe_key)
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id)
  where read_at is null;

comment on table public.user_notifications is
  'Inbox in-app de notificaciones por usuario (dedupe por clave).';

alter table public.user_notifications enable row level security;

drop policy if exists "users read own notifications" on public.user_notifications;
create policy "users read own notifications"
  on public.user_notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own notifications" on public.user_notifications;
create policy "users insert own notifications"
  on public.user_notifications for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own notifications" on public.user_notifications;
create policy "users update own notifications"
  on public.user_notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own notifications" on public.user_notifications;
create policy "users delete own notifications"
  on public.user_notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- Avisa a admins cuando se crea un perfil nuevo.
create or replace function public.notify_admins_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  display_name text;
begin
  display_name := coalesce(nullif(trim(new.full_name), ''), 'Nuevo usuario');

  for admin_id in
    select p.id
    from public.profiles p
    where p.role = 'admin'
      and p.id is distinct from new.id
  loop
    insert into public.user_notifications (user_id, type, title, body, href, dedupe_key, payload)
    values (
      admin_id,
      'admin_new_user',
      'Nuevo usuario registrado',
      display_name || ' se acaba de unir a IngeniaFood.',
      '/admin/usuarios',
      'admin_new_user:' || new.id::text,
      jsonb_build_object('newUserId', new.id, 'fullName', new.full_name)
    )
    on conflict (user_id, dedupe_key) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists profiles_notify_admins_new_user on public.profiles;
create trigger profiles_notify_admins_new_user
  after insert on public.profiles
  for each row
  execute function public.notify_admins_new_user();

-- Soft-delete de notificaciones in-app.
-- Mantiene la fila (y el dedupe_key) para que el sync no las vuelva a crear.

alter table public.user_notifications
  add column if not exists dismissed_at timestamptz;

comment on column public.user_notifications.dismissed_at is
  'Cuando el usuario elimina la notificación de su inbox. El sync no la recrea mientras exista la fila.';

drop index if exists user_notifications_user_unread_idx;
create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id)
  where read_at is null and dismissed_at is null;

create index if not exists user_notifications_user_active_created_idx
  on public.user_notifications (user_id, created_at desc)
  where dismissed_at is null;

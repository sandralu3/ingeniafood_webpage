-- Suscripciones Stripe (1:1 con profiles).
-- Fuente de verdad del pago: webhooks de Stripe escriben aquí (service_role).
-- profiles.is_premium sigue como cache denormalizado para lecturas rápidas legacy;
-- el acceso Premium de pago debe validarse con status + current_period_end.

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive'
    check (
      status in (
        'inactive',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused'
      )
    ),
  price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'Estado de suscripción Stripe por usuario. Solo service_role escribe (webhooks).';

comment on column public.subscriptions.stripe_customer_id is
  'cus_… de Stripe Billing. Único cuando no es null.';

comment on column public.subscriptions.stripe_subscription_id is
  'sub_… de Stripe. Único cuando no es null.';

comment on column public.subscriptions.status is
  'Estado Stripe Billing (active, trialing, past_due, canceled, …).';

comment on column public.subscriptions.price_id is
  'price_… del plan comprado en Stripe.';

comment on column public.subscriptions.current_period_end is
  'Fin del periodo actual de facturación (UTC). Acceso válido hasta esta fecha si status es active/trialing.';

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create index if not exists subscriptions_current_period_end_idx
  on public.subscriptions (current_period_end)
  where current_period_end is not null;

create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_subscriptions_updated_at();

alter table public.subscriptions enable row level security;

-- Lectura: solo el dueño (UI / billing portal).
drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Sin policies de insert/update/delete para authenticated:
-- los webhooks de Stripe usan SUPABASE_SERVICE_ROLE_KEY (bypasa RLS).

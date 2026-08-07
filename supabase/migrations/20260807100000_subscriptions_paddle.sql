-- Migración Stripe → Paddle Billing en public.subscriptions.
-- Renombra IDs de proveedor y actualiza comentarios.

alter table public.subscriptions
  rename column stripe_customer_id to paddle_customer_id;

alter table public.subscriptions
  rename column stripe_subscription_id to paddle_subscription_id;

comment on table public.subscriptions is
  'Estado de suscripción Paddle Billing por usuario. Solo service_role escribe (webhooks).';

comment on column public.subscriptions.paddle_customer_id is
  'ctm_… de Paddle Billing. Único cuando no es null.';

comment on column public.subscriptions.paddle_subscription_id is
  'sub_… de Paddle. Único cuando no es null.';

comment on column public.subscriptions.status is
  'Estado de suscripción (active, trialing, past_due, canceled, paused, …).';

comment on column public.subscriptions.price_id is
  'pri_… del precio Paddle comprado.';

comment on column public.subscriptions.current_period_end is
  'Fin del periodo actual de facturación (UTC). Acceso válido hasta esta fecha si status es active/trialing.';

-- Reset Premium de testers: sin is_premium manual ni suscripciones activas en DB.
-- Tras esto, cada tester (incl. admin) debe activar Premium vía Stripe Checkout.

-- 1) Quitar Premium cacheado a todos los testers.
update public.profiles
set is_premium = false
where is_tester = true
  and is_premium = true;

-- 2) Cancelar en DB cualquier suscripción activa/trialing de testers
--    y limpiar IDs de Stripe obsoletos (evita "No such customer" en Checkout).
--    (Si hay cobros reales en Stripe Dashboard, cancelarlos allí también.)
update public.subscriptions s
set
  status = 'canceled',
  stripe_customer_id = null,
  stripe_subscription_id = null,
  current_period_end = least(coalesce(s.current_period_end, now()), now()),
  updated_at = now()
from public.profiles p
where s.user_id = p.id
  and p.is_tester = true
  and (
    s.status in ('active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused', 'canceled')
    or s.stripe_customer_id is not null
  );

-- 3) Asegurar admin Sandra como tester (sin Premium hasta Checkout).
update public.profiles p
set is_tester = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('sandralu317@hotmail.com')
  and coalesce(p.is_tester, false) = false;

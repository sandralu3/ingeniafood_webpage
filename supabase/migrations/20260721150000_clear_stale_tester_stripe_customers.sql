-- Limpia customer/subscription IDs de Stripe en testers (clientes borrados o de otro modo).
-- Evita el error de Checkout: No such customer: 'cus_…'

update public.subscriptions s
set
  stripe_customer_id = null,
  stripe_subscription_id = null,
  status = 'canceled',
  updated_at = now()
from public.profiles p
where s.user_id = p.id
  and p.is_tester = true
  and (
    s.stripe_customer_id is not null
    or s.stripe_subscription_id is not null
  );

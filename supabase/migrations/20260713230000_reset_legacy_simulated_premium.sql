-- Limpia is_premium de cuentas que lo activaron con la simulación antigua (client-side).
-- La prueba Premium usa premium_trial_remaining, no is_premium.
-- Suscriptores reales deben tener is_premium=true asignado desde el panel/admin.

update public.profiles
set is_premium = false
where is_premium = true
  and premium_trial_claimed_at is null
  and coalesce(premium_trial_remaining, 0) = 0;

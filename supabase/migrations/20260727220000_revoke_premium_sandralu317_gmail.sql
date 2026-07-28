-- Corrección Premium:
-- 1) Restaurar Premium admin sandralu317@hotmail.com
-- 2) Quitar Premium a sandravergara311@gmail.com

begin;

-- Admin: Premium activo (sin trial marcado)
update public.profiles p
set
  is_premium = true,
  premium_trial_remaining = 0,
  premium_trial_claimed_at = null,
  updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('sandralu317@hotmail.com');

-- Usuario Free: sin Premium ni trial
update public.profiles p
set
  is_premium = false,
  premium_trial_remaining = 0,
  premium_trial_claimed_at = coalesce(p.premium_trial_claimed_at, now()),
  updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('sandravergara311@gmail.com');

update public.subscriptions s
set
  status = 'canceled',
  current_period_end = least(coalesce(s.current_period_end, now()), now()),
  updated_at = now()
from auth.users u
where s.user_id = u.id
  and lower(u.email) = lower('sandravergara311@gmail.com')
  and s.status in (
    'active',
    'trialing',
    'past_due',
    'unpaid',
    'incomplete',
    'paused'
  );

commit;

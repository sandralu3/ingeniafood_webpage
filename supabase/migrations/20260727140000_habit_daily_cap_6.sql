-- Economía 100 créditos: tope diario de hábitos personales = 6 (antes 15).

create or replace function public.award_habit_credit(
  p_user_id uuid,
  p_reto_id text,
  p_amount integer,
  p_day_period_key text,
  p_daily_cap integer default 6,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  new_balance integer;
  inserted_id uuid;
  v_action_key text;
  earned_today integer;
  remaining integer;
  award_amount integer;
  daily_cap integer;
begin
  if p_user_id is null
     or p_reto_id is null
     or btrim(p_reto_id) = ''
     or p_day_period_key is null
     or btrim(p_day_period_key) = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  daily_cap := greatest(coalesce(p_daily_cap, 6), 0);
  v_action_key := 'HABITO:' || btrim(p_reto_id);

  select credits into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if current_balance is null then
    return jsonb_build_object('ok', false, 'code', 'USER_NOT_FOUND');
  end if;

  if exists (
    select 1
    from public.credit_transactions
    where user_id = p_user_id
      and action_key = v_action_key
      and period_key = p_day_period_key
      and direction = 'earn'
  ) then
    select coalesce(sum(amount), 0) into earned_today
    from public.credit_transactions
    where user_id = p_user_id
      and direction = 'earn'
      and period_key = p_day_period_key
      and action_key like 'HABITO:%';

    return jsonb_build_object(
      'ok', true,
      'awarded', false,
      'code', 'ALREADY_AWARDED',
      'balance', current_balance,
      'earned_today', earned_today,
      'daily_cap', daily_cap,
      'capped', earned_today >= daily_cap
    );
  end if;

  select coalesce(sum(amount), 0) into earned_today
  from public.credit_transactions
  where user_id = p_user_id
    and direction = 'earn'
    and period_key = p_day_period_key
    and action_key like 'HABITO:%';

  remaining := greatest(daily_cap - earned_today, 0);

  if remaining <= 0 then
    return jsonb_build_object(
      'ok', true,
      'awarded', false,
      'code', 'DAILY_CAP_REACHED',
      'balance', current_balance,
      'earned_today', earned_today,
      'daily_cap', daily_cap,
      'capped', true,
      'remaining', 0
    );
  end if;

  award_amount := least(p_amount, remaining);
  new_balance := current_balance + award_amount;

  update public.profiles
  set credits = new_balance,
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (
    user_id, direction, action_key, amount, period_key, balance_after, metadata
  )
  values (
    p_user_id,
    'earn',
    v_action_key,
    award_amount,
    p_day_period_key,
    new_balance,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'reto_id', btrim(p_reto_id),
      'requested_amount', p_amount,
      'partial', award_amount < p_amount
    )
  )
  returning id into inserted_id;

  return jsonb_build_object(
    'ok', true,
    'awarded', true,
    'amount', award_amount,
    'balance', new_balance,
    'transaction_id', inserted_id,
    'earned_today', earned_today + award_amount,
    'daily_cap', daily_cap,
    'remaining', greatest(daily_cap - (earned_today + award_amount), 0),
    'capped', (earned_today + award_amount) >= daily_cap,
    'partial', award_amount < p_amount
  );
exception
  when unique_violation then
    select credits into current_balance from public.profiles where id = p_user_id;
    select coalesce(sum(amount), 0) into earned_today
    from public.credit_transactions
    where user_id = p_user_id
      and direction = 'earn'
      and period_key = p_day_period_key
      and action_key like 'HABITO:%';

    return jsonb_build_object(
      'ok', true,
      'awarded', false,
      'code', 'ALREADY_AWARDED',
      'balance', coalesce(current_balance, 0),
      'earned_today', earned_today,
      'daily_cap', daily_cap,
      'capped', earned_today >= daily_cap
    );
end;
$$;

comment on function public.award_habit_credit(uuid, text, integer, text, integer, jsonb) is
  'Otorga créditos por hábito personal con tope diario acumulado 6 (economía 100 créditos).';

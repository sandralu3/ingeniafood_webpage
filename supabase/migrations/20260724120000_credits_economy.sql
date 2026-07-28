-- Economía de créditos (moneda) separada de PTS de retos.
-- profiles.credits = saldo gastable
-- profiles.referral_code = código único de invitación
-- credit_transactions = ledger (earn/spend) con cupos por period_key

alter table public.profiles
  add column if not exists credits integer not null default 0;

alter table public.profiles
  add column if not exists referral_code text;

comment on column public.profiles.credits is
  'Saldo de créditos (moneda interna). Solo se gana con acciones de sistema; los retos dan PTS, no créditos.';

comment on column public.profiles.referral_code is
  'Código único de referido para enlaces ?ref=CODIGO.';

create unique index if not exists profiles_referral_code_uidx
  on public.profiles (referral_code)
  where referral_code is not null;

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('earn', 'spend')),
  action_key text not null,
  amount integer not null check (amount > 0),
  period_key text not null,
  balance_after integer not null check (balance_after >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.credit_transactions is
  'Ledger de créditos. Cupos de ganancia: unique (user_id, action_key, period_key) en earns.';

create unique index if not exists credit_transactions_earn_period_uidx
  on public.credit_transactions (user_id, action_key, period_key)
  where direction = 'earn';

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

drop policy if exists "users read own credit transactions" on public.credit_transactions;
create policy "users read own credit transactions"
  on public.credit_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Genera referral_code corto único.
create or replace function public.generate_referral_code(p_user_id uuid)
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    candidate := upper(substr(replace(p_user_id::text, '-', ''), 1 + (attempts % 8), 8));
    if length(candidate) < 8 then
      candidate := upper(substr(md5(p_user_id::text || attempts::text), 1, 8));
    end if;

    exit when not exists (
      select 1 from public.profiles where referral_code = candidate
    );

    if attempts > 20 then
      candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      exit when not exists (
        select 1 from public.profiles where referral_code = candidate
      );
    end if;
  end loop;

  return candidate;
end;
$$;

update public.profiles
set referral_code = public.generate_referral_code(id)
where referral_code is null;

alter table public.profiles
  alter column referral_code set not null;

create or replace function public.profiles_ensure_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null or btrim(new.referral_code) = '' then
    new.referral_code := public.generate_referral_code(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_referral_code on public.profiles;
create trigger profiles_ensure_referral_code
  before insert on public.profiles
  for each row
  execute function public.profiles_ensure_referral_code();

create or replace function public.award_system_credit(
  p_user_id uuid,
  p_action_key text,
  p_amount integer,
  p_period_key text,
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
begin
  if p_user_id is null or p_action_key is null or p_period_key is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

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
      and action_key = p_action_key
      and period_key = p_period_key
      and direction = 'earn'
  ) then
    return jsonb_build_object(
      'ok', true,
      'awarded', false,
      'code', 'ALREADY_AWARDED',
      'balance', current_balance
    );
  end if;

  new_balance := current_balance + p_amount;

  update public.profiles
  set credits = new_balance,
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (
    user_id, direction, action_key, amount, period_key, balance_after, metadata
  )
  values (
    p_user_id, 'earn', p_action_key, p_amount, p_period_key, new_balance, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return jsonb_build_object(
    'ok', true,
    'awarded', true,
    'amount', p_amount,
    'balance', new_balance,
    'transaction_id', inserted_id
  );
exception
  when unique_violation then
    select credits into current_balance from public.profiles where id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'awarded', false,
      'code', 'ALREADY_AWARDED',
      'balance', coalesce(current_balance, 0)
    );
end;
$$;

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
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
  spend_period text;
begin
  if p_user_id is null or p_reason is null or btrim(p_reason) = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  select credits into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if current_balance is null then
    return jsonb_build_object('ok', false, 'code', 'USER_NOT_FOUND');
  end if;

  if current_balance < p_amount then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_CREDITS',
      'balance', current_balance,
      'required', p_amount
    );
  end if;

  new_balance := current_balance - p_amount;
  spend_period := 'spend:' || gen_random_uuid()::text;

  update public.profiles
  set credits = new_balance,
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (
    user_id, direction, action_key, amount, period_key, balance_after, metadata
  )
  values (
    p_user_id, 'spend', p_reason, p_amount, spend_period, new_balance, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return jsonb_build_object(
    'ok', true,
    'spent', true,
    'amount', p_amount,
    'balance', new_balance,
    'transaction_id', inserted_id
  );
end;
$$;

create or replace function public.refund_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
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
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  select credits into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if current_balance is null then
    return jsonb_build_object('ok', false, 'code', 'USER_NOT_FOUND');
  end if;

  new_balance := current_balance + p_amount;

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
    coalesce(nullif(btrim(p_reason), ''), 'REFUND'),
    p_amount,
    'refund:' || gen_random_uuid()::text,
    new_balance,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return jsonb_build_object(
    'ok', true,
    'refunded', true,
    'amount', p_amount,
    'balance', new_balance,
    'transaction_id', inserted_id
  );
end;
$$;

grant execute on function public.award_system_credit(uuid, text, integer, text, jsonb) to authenticated, service_role;
grant execute on function public.spend_credits(uuid, integer, text, jsonb) to authenticated, service_role;
grant execute on function public.refund_credits(uuid, integer, text, jsonb) to authenticated, service_role;

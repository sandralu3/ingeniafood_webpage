-- Reset masivo de la economía de créditos (nueva economía: Free arranca en 0).
-- - profiles.credits = 0 para TODOS los usuarios
-- - Vacía credit_transactions para que el ledger no bloquee re-ganancias
--   (índice único user_id + action_key + period_key) ni descuadre el saldo.

begin;

-- 1) Saldo a 0 (Free y Premium: el gasto solo aplica a Free al gastar).
update public.profiles
set credits = 0,
    updated_at = now()
where credits is distinct from 0;

-- 2) Limpieza del ledger (histórico previo a la nueva economía).
truncate table public.credit_transactions;

-- 3) Garantizar default 0 para altas nuevas.
alter table public.profiles
  alter column credits set default 0;

comment on column public.profiles.credits is
  'Saldo de créditos (única moneda). Nueva economía: saldo inicial 0; Free gasta; Premium de pago no descuenta.';

commit;

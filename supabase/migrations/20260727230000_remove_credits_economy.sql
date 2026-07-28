-- Remove wallet credits economy (Free/Premium now subscription-only).
-- Keeps openai_photo_credits (legacy tester photo quota) and referral_code (invite links).

begin;

drop function if exists public.award_habit_credit(uuid, text, integer, integer, jsonb);
drop function if exists public.award_system_credit(uuid, text, integer, text, jsonb);
drop function if exists public.spend_credits(uuid, text, integer, jsonb);
drop function if exists public.refund_credits(uuid, integer, text, jsonb);

drop table if exists public.credit_transactions;

alter table public.profiles
  drop column if exists credits;

commit;

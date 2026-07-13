-- Ensure premium flag exists for subscription gating.
-- This migration is safe to re-run.

alter table if exists public.profiles
  add column if not exists is_premium boolean not null default false;

comment on column public.profiles.is_premium is
  'Premium subscription flag for advanced healthy cooking features.';


-- Telemetría de llamadas a IA (Gemini / OpenAI) para costes diarios por usuario.
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid references public.profiles (id) on delete set null,
  feature text not null,
  provider text not null check (provider in ('gemini', 'openai')),
  model text,
  status text not null default 'success' check (status in ('success', 'error')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  image_count integer not null default 0 check (image_count >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0,
  latency_ms integer,
  meta jsonb not null default '{}'::jsonb
);

comment on table public.ai_usage_events is
  'Registro append-only de llamadas a proveedores de IA para estimar gasto diario.';

create index if not exists ai_usage_events_created_at_idx
  on public.ai_usage_events (created_at desc);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

create index if not exists ai_usage_events_feature_created_idx
  on public.ai_usage_events (feature, created_at desc);

alter table public.ai_usage_events enable row level security;

-- Solo service role escribe/lee (panel admin vía API con service key).
-- Sin policies para authenticated: los usuarios no ven ni insertan desde el cliente.
drop policy if exists "no client access ai usage" on public.ai_usage_events;

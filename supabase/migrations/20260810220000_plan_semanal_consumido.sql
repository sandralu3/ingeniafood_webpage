-- Marca de "Ya comí" por entrada del plan (no compra ingredientes de ese plato).

alter table public.plan_semanal
  add column if not exists consumido boolean not null default false;

comment on column public.plan_semanal.consumido is
  'True si la persona ya consumió este plato; se excluye de la lista de compra.';

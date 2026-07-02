-- Catálogo de tips saludables de Sandra (tip del día en Home)
create table if not exists public.tips_saludables (
  id         uuid        primary key default gen_random_uuid(),
  contenido  text        not null check (char_length(trim(contenido)) > 0),
  creado_at timestamptz not null default now()
);

comment on table public.tips_saludables is 'Tips saludables rotativos mostrados en la Home de la app.';

alter table public.tips_saludables enable row level security;

drop policy if exists "tips saludables readable by authenticated" on public.tips_saludables;
create policy "tips saludables readable by authenticated"
  on public.tips_saludables for select
  to authenticated
  using (true);

drop policy if exists "sandra admin can insert tips" on public.tips_saludables;
create policy "sandra admin can insert tips"
  on public.tips_saludables for insert
  to authenticated
  with check (
    (auth.jwt() ->> 'email') = 'sandralu317@hotmail.com'
  );

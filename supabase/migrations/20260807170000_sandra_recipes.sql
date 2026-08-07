-- Recetas oficiales de Sandra (badge + banco global).
-- El acceso admin de la app usa email (isSandraAdmin); profiles.role lo alineamos aquí.

alter table public.recipes
  add column if not exists is_sandra_recipe boolean not null default false;

comment on column public.recipes.is_sandra_recipe is
  'Receta oficial de la marca (insignia Receta de Sandra). Suele ir con is_system_recipe=true.';

create index if not exists recipes_sandra_created_idx
  on public.recipes (created_at desc)
  where is_sandra_recipe = true;

-- El banco sistema existente es contenido de Sandra.
update public.recipes
set is_sandra_recipe = true,
    updated_at = now()
where is_system_recipe = true
  and is_sandra_recipe = false;

-- Marca la cuenta creadora como admin en profiles (si existe).
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and lower(coalesce(u.email, '')) = lower('sandralu317@hotmail.com')
  and p.role is distinct from 'admin';

-- SELECT ya cubre is_system_recipe. Refuerzo: Sandra puede actualizar sus propias
-- recetas (incluido promover a sistema) vía cliente; la API de publicación usa service role.
drop policy if exists "sandra admin can update own recipes" on public.recipes;
create policy "sandra admin can update own recipes"
  on public.recipes for update
  to authenticated
  using (
    auth.uid() = user_id
    and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('sandralu317@hotmail.com')
  )
  with check (
    auth.uid() = user_id
    and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('sandralu317@hotmail.com')
  );

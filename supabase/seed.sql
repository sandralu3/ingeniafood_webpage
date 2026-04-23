-- Seed data for: Sandra Vergara | Cocina Inteligente
-- Run this in Supabase SQL Editor AFTER creating at least 1 auth user.
-- Optional: set v_target_email to seed a specific account.

begin;

do $$
declare
  v_target_email text := null; -- Example: 'tu-correo@dominio.com'
  v_user_id uuid;
  v_recipe_1 uuid;
  v_recipe_2 uuid;
  v_recipe_3 uuid;
begin
  -- 1) If email is provided, seed that specific user.
  -- 2) If not found, fallback to the first registered user.
  if v_target_email is not null then
    select id
    into v_user_id
    from auth.users
    where lower(email) = lower(v_target_email)
    limit 1;
  end if;

  if v_user_id is null then
    select id
    into v_user_id
    from auth.users
    order by created_at asc
    limit 1;
  end if;

  if v_user_id is null then
    raise exception 'No users found in auth.users. Create a user first and run seed again.';
  end if;

  -- Ensure profile exists for that user.
  insert into public.profiles (id, full_name, avatar_url, is_premium)
  values (
    v_user_id,
    'Sandra Test User',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
    true
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        avatar_url = excluded.avatar_url;

  -- Recipe 1: Airfryer + Flourless
  insert into public.recipes (
    user_id,
    title,
    description,
    ingredients,
    instructions,
    cooking_time,
    image_url,
    is_airfryer,
    is_flourless,
    is_public
  )
  values (
    v_user_id,
    'Pollo Crispy Airfryer Sin Harinas',
    'Receta rapida, alta en proteina y sin harinas refinadas.',
    '[
      {"name":"pechuga de pollo","quantity":"500 g"},
      {"name":"paprika","quantity":"1 cdita"},
      {"name":"ajo en polvo","quantity":"1 cdita"},
      {"name":"aceite de oliva","quantity":"1 cda"},
      {"name":"sal marina","quantity":"al gusto"}
    ]'::jsonb,
    '1) Mezcla especias y aceite. 2) Marina el pollo 15 min. 3) Cocina en airfryer a 190C por 18-20 min.',
    25,
    'https://images.unsplash.com/photo-1604908554265-38d64d5f3f45?w=1200',
    true,
    true,
    true
  )
  returning id into v_recipe_1;

  -- Recipe 2: Flourless bowl
  insert into public.recipes (
    user_id,
    title,
    description,
    ingredients,
    instructions,
    cooking_time,
    image_url,
    is_airfryer,
    is_flourless,
    is_public
  )
  values (
    v_user_id,
    'Bowl Verde Anti Inflamatorio',
    'Comida ligera con grasas saludables y vegetales frescos.',
    '[
      {"name":"espinaca","quantity":"2 tazas"},
      {"name":"aguacate","quantity":"1 unidad"},
      {"name":"pepino","quantity":"1/2 unidad"},
      {"name":"semillas de calabaza","quantity":"2 cdas"},
      {"name":"limon","quantity":"1 unidad"}
    ]'::jsonb,
    '1) Lava y corta vegetales. 2) Mezcla en bowl. 3) Agrega limon y semillas antes de servir.',
    12,
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200',
    false,
    true,
    true
  )
  returning id into v_recipe_2;

  -- Recipe 3: Fast smoothie
  insert into public.recipes (
    user_id,
    title,
    description,
    ingredients,
    instructions,
    cooking_time,
    image_url,
    is_airfryer,
    is_flourless,
    is_public
  )
  values (
    v_user_id,
    'Smoothie Rojo de Energia Limpia',
    'Desayuno rapido, sin harinas y rico en antioxidantes.',
    '[
      {"name":"frutos rojos congelados","quantity":"1 taza"},
      {"name":"yogur griego natural","quantity":"1/2 taza"},
      {"name":"chia","quantity":"1 cda"},
      {"name":"agua","quantity":"1/2 taza"}
    ]'::jsonb,
    '1) Licua todos los ingredientes por 40 segundos. 2) Ajusta textura con agua. 3) Servir frio.',
    5,
    'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=1200',
    false,
    true,
    true
  )
  returning id into v_recipe_3;

  -- Save one recipe as favorite for the same user.
  insert into public.saved_recipes (user_id, recipe_id)
  values (v_user_id, v_recipe_1)
  on conflict (user_id, recipe_id) do nothing;

  raise notice 'Seed completed for user %', v_user_id;
  raise notice 'Inserted recipes: %, %, %', v_recipe_1, v_recipe_2, v_recipe_3;
end $$;

commit;

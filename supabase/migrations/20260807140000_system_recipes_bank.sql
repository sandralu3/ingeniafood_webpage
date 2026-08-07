-- Banco de recetas del sistema para el picker del plan (Free + Premium).
-- Sin bloque DO $$ (el SQL Editor de Supabase a menudo lo trunca / rompe).

alter table public.recipes
  add column if not exists is_system_recipe boolean not null default false;

comment on column public.recipes.is_system_recipe is
  'Recetas base de IngeniaFood visibles para todos en el picker (no son del catalogo Instagram).';

create index if not exists recipes_system_created_idx
  on public.recipes (created_at desc)
  where is_system_recipe = true;

drop policy if exists "public recipes are readable by everyone" on public.recipes;
create policy "public recipes are readable by everyone"
  on public.recipes for select
  to authenticated, anon
  using (
    is_public = true
    or is_system_recipe = true
    or auth.uid() = user_id
  );

-- Asegura perfil del owner (admin Sandra) si existe en Auth.
insert into public.profiles (id, full_name)
select u.id, 'Sandra Vergara'
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do nothing;

-- 1 Desayuno
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000001'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
  'Yogur griego con frutos rojos y chia',
  'Desayuno proteico sin azucar anadido ni harinas refinadas.',
  '[{"name":"yogur griego natural","quantity":"200 g"},{"name":"frutos rojos","quantity":"80 g"},{"name":"semillas de chia","quantity":"1 cda"},{"name":"canela","quantity":"1 pizca"},{"name":"almendras laminadas","quantity":"10 g"}]'::jsonb,
  '["Pon el yogur en un bol.","Anade los frutos rojos y la chia.","Espolvorea canela y almendras.","Deja reposar 2 minutos y sirve."]'::jsonb,
  '1) Pon el yogur en un bol. 2) Anade frutos rojos y chia. 3) Espolvorea canela y almendras. 4) Reposa 2 min y sirve.',
  'Si quieres mas dulzor natural, machaca un par de frambuesas contra el yogur.',
  5, 'desayuno', 1, 'facil', false, true, false, false, true,
  '{"calories":280,"protein":22,"carbs":18,"fat":12}'::jsonb,
  '["desayuno","sin_azucar","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 2 Desayuno
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000002'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  'Tortilla de claras con espinacas',
  'Desayuno alto en proteina, rapido y sin harinas.',
  '[{"name":"claras de huevo","quantity":"4 uds"},{"name":"espinacas frescas","quantity":"50 g"},{"name":"aceite de oliva","quantity":"1 cdita"},{"name":"sal marina","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb,
  '["Calienta el aceite en una sarten antiadherente.","Sofrie las espinacas 1 minuto.","Vierte las claras batidas.","Cuaja a fuego medio y sirve."]'::jsonb,
  '1) Calienta el aceite. 2) Sofrie espinacas 1 min. 3) Anade claras batidas. 4) Cuaja y sirve.',
  'Anade una yema si quieres mas saciedad sin perder el perfil ligero.',
  10, 'desayuno', 1, 'facil', false, true, false, false, true,
  '{"calories":160,"protein":24,"carbs":3,"fat":5}'::jsonb,
  '["desayuno","alto_proteina","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 3 Almuerzo
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000003'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  'Bowl de quinoa, pollo y verduras',
  'Almuerzo completo, equilibrado y sin harinas refinadas.',
  '[{"name":"quinoa cocida","quantity":"120 g"},{"name":"pechuga de pollo","quantity":"150 g"},{"name":"calabacin","quantity":"1/2 ud"},{"name":"pimiento rojo","quantity":"1/2 ud"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"limon","quantity":"1 chorrito"},{"name":"sal y especias","quantity":"al gusto"}]'::jsonb,
  '["Sala y cocina el pollo a la plancha.","Saltea las verduras con aceite.","Monta el bowl con quinoa, pollo y verduras.","Alina con limon y sirve."]'::jsonb,
  '1) Cocina el pollo a la plancha. 2) Saltea verduras. 3) Monta el bowl con quinoa. 4) Alina con limon.',
  'Prepara quinoa de mas y usala en almuerzos de 2-3 dias.',
  25, 'almuerzo', 1, 'intermedio', false, true, false, false, true,
  '{"calories":420,"protein":38,"carbs":32,"fat":14}'::jsonb,
  '["almuerzo","bowl","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 4 Almuerzo
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000004'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
  'Ensalada de salmon y aguacate',
  'Almuerzo fresco rico en omega-3, sin pan ni harinas.',
  '[{"name":"salmon cocido o ahumado","quantity":"120 g"},{"name":"aguacate","quantity":"1/2 ud"},{"name":"rucula o mix de hojas","quantity":"80 g"},{"name":"tomate cherry","quantity":"8 uds"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"vinagre de manzana","quantity":"1 cdita"}]'::jsonb,
  '["Lava y seca las hojas.","Trocea tomate y aguacate.","Desmenuza el salmon encima.","Alina con aceite y vinagre."]'::jsonb,
  '1) Prepara las hojas. 2) Anade tomate y aguacate. 3) Incorpora el salmon. 4) Alina y sirve.',
  'Si usas salmon ahumado, controla la sal del alino.',
  15, 'almuerzo', 1, 'facil', false, true, false, false, true,
  '{"calories":390,"protein":28,"carbs":10,"fat":26}'::jsonb,
  '["almuerzo","ensalada","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 5 Cena
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000005'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
  'Merluza al horno con brocoli',
  'Cena ligera, rapida y sin acompanamiento de harinas.',
  '[{"name":"lomos de merluza","quantity":"200 g"},{"name":"brocoli","quantity":"200 g"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"ajo","quantity":"1 diente"},{"name":"limon","quantity":"2 rodajas"},{"name":"sal y pimienta","quantity":"al gusto"}]'::jsonb,
  '["Precalienta el horno a 190C.","Coloca merluza y brocoli en bandeja.","Riega con aceite, ajo y limon.","Hornea 15-18 minutos."]'::jsonb,
  '1) Horno a 190C. 2) Merluza y brocoli en bandeja. 3) Aceite, ajo y limon. 4) Hornea 15-18 min.',
  'Tambien funciona en airfryer a 180C unos 12-14 minutos.',
  20, 'cena', 1, 'facil', true, true, false, false, true,
  '{"calories":310,"protein":36,"carbs":8,"fat":14}'::jsonb,
  '["cena","pescado","airfryer","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_airfryer = excluded.is_airfryer,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 6 Cena
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000006'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
  'Salteado de pavo y calabacin',
  'Cena expres alta en proteina y vegetales.',
  '[{"name":"pavo en tiras","quantity":"150 g"},{"name":"calabacin","quantity":"1 ud"},{"name":"cebolla","quantity":"1/4 ud"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"pimenton dulce","quantity":"1/2 cdita"},{"name":"sal","quantity":"al gusto"}]'::jsonb,
  '["Corta el calabacin en medias lunas.","Dora el pavo en la sarten.","Anade cebolla y calabacin.","Sazona con pimenton y sirve."]'::jsonb,
  '1) Corta el calabacin. 2) Dora el pavo. 3) Anade verdura. 4) Sazona y sirve.',
  'Termina con un chorrito de limon para realzar el sabor sin calorias vacias.',
  15, 'cena', 1, 'facil', false, true, false, false, true,
  '{"calories":290,"protein":34,"carbs":9,"fat":12}'::jsonb,
  '["cena","salteado","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 7 Snack
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000007'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=800&q=80',
  'Hummus casero con crudites',
  'Snack salado sin pan: garbanzo, tahini y verduras crujientes.',
  '[{"name":"garbanzos cocidos","quantity":"150 g"},{"name":"tahini","quantity":"1 cda"},{"name":"limon","quantity":"1 cda zumo"},{"name":"aceite de oliva","quantity":"1 cdita"},{"name":"zanahoria","quantity":"1 ud"},{"name":"pepino","quantity":"1/2 ud"}]'::jsonb,
  '["Tritura garbanzos, tahini, limon y aceite.","Ajusta sal y textura con un poco de agua.","Corta zanahoria y pepino en bastones.","Sirve el hummus con las crudites."]'::jsonb,
  '1) Tritura garbanzos con tahini y limon. 2) Ajusta textura. 3) Corta verduras. 4) Sirve.',
  'Guarda el hummus 3 dias en nevera para snacks express.',
  10, 'snack', 1, 'facil', false, true, false, false, true,
  '{"calories":220,"protein":9,"carbs":20,"fat":11}'::jsonb,
  '["snack","sin_azucar","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 8 Snack
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000008'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=800&q=80',
  'Manzana con crema de almendras',
  'Snack dulce natural, sin azucar anadido ni galletas.',
  '[{"name":"manzana","quantity":"1 ud"},{"name":"crema de almendras 100%","quantity":"1 cda"},{"name":"canela","quantity":"1 pizca"}]'::jsonb,
  '["Lava y corta la manzana en rodajas.","Unta cada rodaja con crema de almendras.","Espolvorea canela y sirve."]'::jsonb,
  '1) Corta la manzana. 2) Unta crema de almendras. 3) Anade canela.',
  'Elige crema de frutos secos sin azucares anadidos en la etiqueta.',
  5, 'snack', 1, 'facil', false, true, false, false, true,
  '{"calories":190,"protein":5,"carbs":22,"fat":10}'::jsonb,
  '["snack","sin_azucar","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 9 Postre
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-000000000009'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
  'Mousse de cacao y aguacate',
  'Postre cremoso sin azucar refinado ni harinas.',
  '[{"name":"aguacate maduro","quantity":"1 ud"},{"name":"cacao puro en polvo","quantity":"2 cdas"},{"name":"datiles sin hueso","quantity":"2 uds"},{"name":"leche de almendras","quantity":"3 cdas"},{"name":"vainilla","quantity":"1/2 cdita"}]'::jsonb,
  '["Hidrata los datiles 5 minutos si estan duros.","Tritura todos los ingredientes hasta crema.","Enfria 20 minutos en nevera.","Sirve en vasitos."]'::jsonb,
  '1) Hidrata datiles si hace falta. 2) Tritura todo. 3) Enfria 20 min. 4) Sirve.',
  'Cuanto mas maduro el aguacate, mas sedosa queda la mousse.',
  15, 'postre', 2, 'facil', false, true, false, false, true,
  '{"calories":210,"protein":4,"carbs":18,"fat":15}'::jsonb,
  '["postre","sin_azucar","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

-- 10 Postre / snack
insert into public.recipes (
  id, user_id, image_url, title, description, ingredients, steps, instructions, tip_sandra,
  cooking_time, meal_type, servings, complexity, is_airfryer, is_flourless,
  is_public, es_instagram, is_system_recipe, macros, tags
)
select
  'a1000001-0000-4000-8000-00000000000a'::uuid,
  u.id,
  'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80',
  'Bolitas energeticas de datil y cacao',
  'Bocados rapidos endulzados solo con fruta, sin harinas.',
  '[{"name":"datiles Medjool","quantity":"8 uds"},{"name":"almendras","quantity":"60 g"},{"name":"cacao puro","quantity":"1 cda"},{"name":"coco rallado sin azucar","quantity":"2 cdas"}]'::jsonb,
  '["Tritura datiles y almendras hasta pasta.","Incorpora cacao.","Forma bolitas con las manos.","Pasa por coco rallado y guarda en frio."]'::jsonb,
  '1) Tritura datiles y almendras. 2) Anade cacao. 3) Forma bolitas. 4) Pasa por coco y enfria.',
  'Congelalas: sacas 1-2 unidades cuando apetezca algo dulce.',
  15, 'postre', 8, 'facil', false, true, false, false, true,
  '{"calories":95,"protein":2,"carbs":12,"fat":5}'::jsonb,
  '["postre","snack","sin_azucar","sin_harinas"]'::jsonb
from auth.users u
where lower(u.email) = lower('sandralu317@hotmail.com')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  instructions = excluded.instructions,
  tip_sandra = excluded.tip_sandra,
  cooking_time = excluded.cooking_time,
  meal_type = excluded.meal_type,
  is_flourless = excluded.is_flourless,
  is_system_recipe = true,
  is_public = false,
  es_instagram = false,
  image_url = excluded.image_url,
  macros = excluded.macros,
  tags = excluded.tags,
  updated_at = now();

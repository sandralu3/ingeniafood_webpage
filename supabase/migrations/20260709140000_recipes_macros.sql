-- Macronutrientes estimados por porción (procedentes de Gemini al generar receta)
alter table public.recipes
  add column if not exists macros jsonb;

comment on column public.recipes.macros is
  'Macronutrientes por porción: { proteinas_g, carbohidratos_g, grasas_g, calorias }';

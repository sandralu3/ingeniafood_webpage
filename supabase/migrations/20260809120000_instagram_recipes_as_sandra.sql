-- Las recetas públicas del catálogo Instagram pasan a «Recetas de Sandra».
update public.recipes
set is_sandra_recipe = true,
    is_system_recipe = true,
    updated_at = now()
where es_instagram = true
  and is_public = true
  and (
    is_sandra_recipe = false
    or is_system_recipe = false
  );

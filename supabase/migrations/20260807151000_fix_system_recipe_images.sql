-- Corrige URL 404 de bolitas energeticas + asegura imagenes del banco sistema.

update public.recipes
set
  image_url = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80',
  updated_at = now()
where id = 'a1000001-0000-4000-8000-00000000000a'
  and is_system_recipe = true;

-- Reaplica el resto por si alguna quedo sin imagen.
update public.recipes set image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000001' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000002' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000003' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000004' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000005' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000006' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000007' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000008' and is_system_recipe = true;

update public.recipes set image_url = 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', updated_at = now()
where id = 'a1000001-0000-4000-8000-000000000009' and is_system_recipe = true;

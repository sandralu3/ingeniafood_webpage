-- Permite que usuarios autenticados añadan ingredientes al catálogo global.
drop policy if exists "authenticated users can insert master ingredients" on public.master_ingredients;
create policy "authenticated users can insert master ingredients"
on public.master_ingredients
for insert
to authenticated
with check (char_length(trim(name)) >= 3);

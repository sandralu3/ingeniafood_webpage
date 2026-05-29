-- Asegura FK explícita para que PostgREST detecte la relación (embeds opcionales).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_pantry_favorites_ingredient_id_fkey'
  ) then
    alter table public.user_pantry_favorites
      add constraint user_pantry_favorites_ingredient_id_fkey
      foreign key (ingredient_id)
      references public.master_ingredients (id)
      on delete cascade;
  end if;
end $$;

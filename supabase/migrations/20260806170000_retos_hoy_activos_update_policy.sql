-- Permitir actualizar dias_semana de retos activos (faltaba policy UPDATE).

drop policy if exists "users update own active challenges" on public.retos_hoy_activos;
create policy "users update own active challenges"
  on public.retos_hoy_activos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

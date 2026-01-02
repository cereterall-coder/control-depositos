-- FEATURE: DELETE WITH TIME LIMIT & CURRENCY TWEAKS

-- 1. Actualizar permisos para BORRAR (DELETE)
-- Permitir al remitente borrar solo si fue creado HOY (UTC)
create policy "Sender can delete own deposits just today"
  on public.deposits for delete
  using (
    (auth.uid() = sender_id AND created_at::date = now()::date)
    OR 
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- 2. Asegurar que el Admin pueda hacer todo (opcional, por si acaso)
create policy "Admin has full access"
  on public.deposits for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- POLICY: Permitir a los usuarios actualizar sus propios depósitos
-- Permite UPDATE si el sender_id coincide con el ID del usuario autenticado

CREATE POLICY "Users can update own deposits" 
ON deposits 
FOR UPDATE 
USING (auth.uid() = sender_id);

-- Optional: Ensure RLS is enabled
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

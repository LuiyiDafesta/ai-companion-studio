-- 1. Eliminar políticas duplicadas/antiguas que pueden estar causando conflictos
DROP POLICY IF EXISTS "credits_select" ON ah_credits;
DROP POLICY IF EXISTS "credits_insert" ON ah_credits;
DROP POLICY IF EXISTS "credits_update" ON ah_credits;

-- 2. Asegurarnos de que las políticas correctas están habilitadas (esto ya lo hiciste, pero reafirma)
ALTER TABLE ah_credits FORCE ROW LEVEL SECURITY;

-- 3. Consulta para ver si hay TRIGGERS que estén bloqueando la actualización
-- (El resultado de esto deberían ser 0 filas o solo triggers conocidos de log)
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'ah_credits';

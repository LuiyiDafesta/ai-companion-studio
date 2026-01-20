-- Función Segura para Actualizar Webhooks
-- Esta selección evita problemas de permisos RLS complejos

CREATE OR REPLACE FUNCTION update_webhook_configuration(
    p_id uuid,
    p_url text,
    p_is_active boolean DEFAULT null
)
RETURNS json AS $$
DECLARE
    v_user_role text;
    v_result json;
BEGIN
    -- 1. Verificar si el usuario es admin (bypass RLS de perfiles)
    SELECT role INTO v_user_role
    FROM public.ah_profiles
    WHERE id = auth.uid();

    -- Si no se encuentra el rol o no es admin, lanzar error
    IF v_user_role IS DISTINCT FROM 'admin' THEN
        -- Fallback: Permitir si es el propietario o para debugging, 
        -- PERO por seguridad idealmente solo admin.
        -- Para resolver tu bloqueo actual, verificaremos si el rol es NULL (a veces pasa en desarrollo)
        -- Si v_user_role es NULL, asumimos que es un error de configuración y permitimos el update por ahora si estamos en modo dev
        -- O, simplemente lanzamos error.
        
        RAISE EXCEPTION 'Permiso denegado: Se requiere rol de administrador. Tu rol actual es: %', v_user_role;
    END IF;

    -- 2. Actualizar configuración
    UPDATE public.webhook_configurations
    SET 
        url = p_url,
        is_active = COALESCE(p_is_active, is_active),
        updated_at = now()
    WHERE id = p_id
    RETURNING row_to_json(webhook_configurations.*) INTO v_result;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'No se encontró el webhook con ID %', p_id;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

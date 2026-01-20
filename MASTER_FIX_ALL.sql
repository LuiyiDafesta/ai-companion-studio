-- =====================================================
-- SCRIPT MAESTRO DE CORRECCIÓN - AgentHubs
-- Ejecutar COMPLETO en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAR/CREAR TABLAS CON PREFIJO ah_
-- =====================================================

-- Crear tabla ah_profiles si no existe (puede ser un alias o tabla separada)
-- Primero verificar si ya existe
DO $$
BEGIN
  -- Si profiles existe pero ah_profiles no, crear vista o renombrar
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_profiles' AND table_schema = 'public') THEN
    -- Crear vista para compatibilidad
    EXECUTE 'CREATE OR REPLACE VIEW public.ah_profiles AS SELECT * FROM public.profiles';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_agents' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.ah_agents AS SELECT * FROM public.agents';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_documents' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.ah_documents AS SELECT * FROM public.documents';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credits' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_credits' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.ah_credits AS SELECT * FROM public.credits';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_conversations' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.ah_conversations AS SELECT * FROM public.conversations';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_messages' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.ah_messages AS SELECT * FROM public.messages';
  END IF;
END $$;

-- =====================================================
-- PARTE 2: TABLA DE WEBHOOKS (si no existe)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.webhook_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    url text NOT NULL DEFAULT '',
    is_active boolean DEFAULT true,
    category text DEFAULT 'general',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insertar webhooks predeterminados (incluyendo VECTORIZE)
INSERT INTO public.webhook_configurations (key, name, description, url, category) VALUES
    ('VITE_N8N_WEBHOOK_URL', 'Generación de Prompts', 'Webhook para generar prompts con IA', '', 'ai'),
    ('VITE_N8N_CHAT_WEBHOOK_URL', 'Chat con Agente', 'Webhook principal para el chat con agentes de IA', '', 'chat'),
    ('VITE_N8N_VECTORIZE_WEBHOOK_URL', 'Vectorizar Documentos', 'Webhook para vectorizar documentos y crear embeddings', '', 'ai'),
    ('VITE_N8N_DELETE_EMBEDDINGS_WEBHOOK_URL', 'Eliminar Embeddings', 'Webhook para eliminar embeddings de documentos', '', 'ai'),
    ('VITE_N8N_GET_HISTORY_WEBHOOK_URL', 'Obtener Historial', 'Webhook para recuperar el historial de conversaciones', '', 'chat'),
    ('VITE_N8N_CLEAR_HISTORY_WEBHOOK_URL', 'Limpiar Historial', 'Webhook para limpiar el historial de conversaciones', '', 'chat'),
    ('VITE_N8N_EMBEDDINGS_WEBHOOK_URL', 'Embeddings', 'Webhook para crear/eliminar tablas de embeddings de agentes', '', 'ai'),
    ('VITE_N8N_EMAIL_WELCOME_WEBHOOK', 'Email Bienvenida', 'Webhook para enviar emails de bienvenida', '', 'email'),
    ('VITE_N8N_EMAIL_NEW_MESSAGE_WEBHOOK', 'Email Nuevo Mensaje', 'Webhook para notificar nuevos mensajes', '', 'email'),
    ('VITE_N8N_EMAIL_NEW_CONVERSATION_WEBHOOK', 'Email Nueva Conversación', 'Webhook para notificar nuevas conversaciones', '', 'email'),
    ('VITE_N8N_EMAIL_LOW_CREDITS_WEBHOOK', 'Email Créditos Bajos', 'Webhook para alertar créditos bajos', '', 'email'),
    ('VITE_N8N_EMAIL_MARKETING_WEBHOOK', 'Email Marketing', 'Webhook para emails de marketing', '', 'email'),
    ('VITE_N8N_EMAIL_WEEKLY_REPORT_WEBHOOK', 'Email Reporte Semanal', 'Webhook para enviar reportes semanales', '', 'email')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- PARTE 3: FUNCIÓN get_webhook_url (para leer webhooks)
-- =====================================================

CREATE OR REPLACE FUNCTION get_webhook_url(webhook_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    webhook_url text;
BEGIN
    SELECT url INTO webhook_url
    FROM public.webhook_configurations
    WHERE key = webhook_key AND is_active = true;
    
    RETURN COALESCE(webhook_url, '');
END;
$$;

-- =====================================================
-- PARTE 4: FUNCIÓN get_all_webhooks (para admin)
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_webhooks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(w))
        FROM public.webhook_configurations w
        ORDER BY category, name
    );
END;
$$;

-- =====================================================
-- PARTE 5: FUNCIÓN update_webhook_configuration
-- =====================================================

CREATE OR REPLACE FUNCTION update_webhook_configuration(
    p_id uuid,
    p_url text,
    p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    UPDATE public.webhook_configurations
    SET 
        url = COALESCE(p_url, url),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = now()
    WHERE id = p_id
    RETURNING row_to_json(webhook_configurations.*) INTO result;
    
    RETURN result;
END;
$$;

-- =====================================================
-- PARTE 6: TRIGGER DE CRÉDITOS (descuento automático)
-- =====================================================

-- Primero identificar la tabla de créditos correcta
DO $$
DECLARE
    credits_table_name text;
BEGIN
    -- Determinar qué tabla usar
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_credits' AND table_schema = 'public') THEN
        credits_table_name := 'ah_credits';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credits' AND table_schema = 'public') THEN
        credits_table_name := 'credits';
    ELSE
        RAISE NOTICE 'No credits table found';
        RETURN;
    END IF;
END $$;

-- Función para descontar créditos automáticamente
CREATE OR REPLACE FUNCTION handle_new_usage_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Intentar actualizar ah_credits primero
    UPDATE ah_credits
    SET balance = balance - NEW.amount
    WHERE user_id = NEW.user_id;
    
    -- Si no actualizó ninguna fila, intentar con credits
    IF NOT FOUND THEN
        UPDATE credits
        SET balance = balance - NEW.amount
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE NOTICE 'Error updating credits: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Crear trigger en ah_usage_logs
DROP TRIGGER IF EXISTS on_usage_log_insert ON ah_usage_logs;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_usage_logs' AND table_schema = 'public') THEN
        CREATE TRIGGER on_usage_log_insert
        AFTER INSERT ON ah_usage_logs
        FOR EACH ROW
        EXECUTE FUNCTION handle_new_usage_log();
    END IF;
END $$;

-- =====================================================
-- PARTE 7: RLS CORREGIDO PARA AGENTES (Admin ve todos)
-- =====================================================

-- Eliminar políticas antiguas que puedan estar mal
DO $$
BEGIN
    -- Para ah_agents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ah_agents' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admins can view all agents" ON ah_agents;
        DROP POLICY IF EXISTS "Users can view own agents" ON ah_agents;
        
        -- Crear políticas correctas
        CREATE POLICY "Users can view own agents" ON ah_agents 
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Admins can view all agents" ON ah_agents 
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
            );
    END IF;
    
    -- Para agents (tabla original sin prefijo)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admins can view all agents" ON agents;
        
        -- Verificar y crear política de admin
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agents' AND policyname = 'Admins can view all agents') THEN
            CREATE POLICY "Admins can view all agents" ON agents 
                FOR SELECT USING (
                    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
                );
        END IF;
    END IF;
END $$;

-- =====================================================
-- PARTE 8: RLS PARA WEBHOOKS (usando user_roles correcto)
-- =====================================================

ALTER TABLE public.webhook_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook configurations" ON webhook_configurations;
DROP POLICY IF EXISTS "Admins can update webhook configurations" ON webhook_configurations;
DROP POLICY IF EXISTS "Admins can insert webhook configurations" ON webhook_configurations;

CREATE POLICY "Admins can view webhook configurations"
    ON public.webhook_configurations FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update webhook configurations"
    ON public.webhook_configurations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert webhook configurations"
    ON public.webhook_configurations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- PARTE 9: PERMISOS DE EJECUCIÓN
-- =====================================================

GRANT EXECUTE ON FUNCTION get_webhook_url(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_url(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_all_webhooks() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_webhooks() TO service_role;
GRANT EXECUTE ON FUNCTION update_webhook_configuration(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION update_webhook_configuration(uuid, text, boolean) TO service_role;

-- =====================================================
-- PARTE 10: TABLAS PÚBLICAS (para widget de chat)
-- =====================================================

-- Verificar que existen las tablas públicas
CREATE TABLE IF NOT EXISTS public.ah_public_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL,
    visitor_id text NOT NULL,
    visitor_name text,
    visitor_email text,
    status text DEFAULT 'active',
    tokens_used integer DEFAULT 0,
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ah_public_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES ah_public_conversations(id) ON DELETE CASCADE,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS permisivo para tablas públicas (widget no autenticado)
ALTER TABLE ah_public_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ah_public_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert conversations" ON ah_public_conversations;
DROP POLICY IF EXISTS "Public can view conversations" ON ah_public_conversations;
DROP POLICY IF EXISTS "Public can update conversations" ON ah_public_conversations;
DROP POLICY IF EXISTS "Public can insert messages" ON ah_public_messages;
DROP POLICY IF EXISTS "Public can view messages" ON ah_public_messages;

CREATE POLICY "Public can insert conversations" ON ah_public_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view conversations" ON ah_public_conversations FOR SELECT USING (true);
CREATE POLICY "Public can update conversations" ON ah_public_conversations FOR UPDATE USING (true);
CREATE POLICY "Public can insert messages" ON ah_public_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view messages" ON ah_public_messages FOR SELECT USING (true);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

SELECT 'Script ejecutado correctamente. Verificar en la consola que no haya errores.' as resultado;

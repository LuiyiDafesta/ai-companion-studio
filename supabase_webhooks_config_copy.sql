-- =====================================================
-- Tabla para configuración de Webhooks de n8n
-- Permite administrar los webhooks desde el panel de admin
-- =====================================================

-- Crear tabla de configuración de webhooks
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

-- Comentario de la tabla
COMMENT ON TABLE public.webhook_configurations IS 'Configuración de webhooks de n8n administrables desde el panel';

-- Insertar webhooks predeterminados
INSERT INTO public.webhook_configurations (key, name, description, url, category) VALUES
    ('VITE_N8N_WEBHOOK_URL', 'Generación de Prompts', 'Webhook para generar prompts con IA', '', 'ai'),
    ('VITE_N8N_CHAT_WEBHOOK_URL', 'Chat con Agente', 'Webhook principal para el chat con agentes de IA', '', 'chat'),
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

-- Habilitar RLS
ALTER TABLE public.webhook_configurations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Solo admins pueden ver y modificar
CREATE POLICY "Admins can view webhook configurations"
    ON public.webhook_configurations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ah_profiles
            WHERE ah_profiles.id = auth.uid()
            AND ah_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update webhook configurations"
    ON public.webhook_configurations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ah_profiles
            WHERE ah_profiles.id = auth.uid()
            AND ah_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert webhook configurations"
    ON public.webhook_configurations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ah_profiles
            WHERE ah_profiles.id = auth.uid()
            AND ah_profiles.role = 'admin'
        )
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_webhook_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_webhook_configurations_updated_at ON public.webhook_configurations;
CREATE TRIGGER update_webhook_configurations_updated_at
    BEFORE UPDATE ON public.webhook_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_configurations_updated_at();

-- Función RPC para obtener webhook por key (para uso en la app)
CREATE OR REPLACE FUNCTION get_webhook_url(webhook_key text)
RETURNS text AS $$
DECLARE
    webhook_url text;
BEGIN
    SELECT url INTO webhook_url
    FROM public.webhook_configurations
    WHERE key = webhook_key AND is_active = true;
    
    RETURN COALESCE(webhook_url, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para obtener todos los webhooks (para admin)
CREATE OR REPLACE FUNCTION get_all_webhooks()
RETURNS json AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(w))
        FROM public.webhook_configurations w
        ORDER BY category, name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

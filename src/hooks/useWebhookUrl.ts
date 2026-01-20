import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache simple en memoria para evitar llamadas excesivas a DB
const webhookCache: Record<string, string> = {};

export const useWebhookUrl = (webhookKey: string) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchUrl = async () => {
            // 1. Revisar cache primero
            if (webhookCache[webhookKey]) {
                setUrl(webhookCache[webhookKey]);
                setLoading(false);
                return;
            }

            // 2. Revisar import.meta.env como fallback para desarrollo
            const envValue = import.meta.env[webhookKey];

            try {
                // 3. Intentar obtener desde DB
                const { data, error } = await supabase
                    .rpc('get_webhook_url', { webhook_key: webhookKey });

                if (error) {
                    console.error(`Error fetching webhook ${webhookKey}:`, error);
                    // Si falla DB, usar env si existe
                    if (envValue) {
                        setUrl(envValue);
                    }
                    throw error;
                }

                if (data) {
                    webhookCache[webhookKey] = data; // Guardar en cache
                    setUrl(data);
                } else if (envValue) {
                    // Si DB devuelve vacío pero hay var de entorno, usar entorno
                    setUrl(envValue);
                } else {
                    setUrl(''); // No encontrado
                }
            } catch (err) {
                console.error(err);
                setError(err as Error);
                // Fallback a env en caso de error crítico
                if (envValue) setUrl(envValue);
            } finally {
                setLoading(false);
            }
        };

        fetchUrl();
    }, [webhookKey]);

    // Función síncrona para obtener el valor si ya se cargó, o el de entorno
    // Útil para inicializaciones rápidas
    const getUrlSync = () => {
        return webhookCache[webhookKey] || import.meta.env[webhookKey] || '';
    };

    return { url, loading, error, getUrlSync };
};

// Utility function para usar fuera de componentes React (async)
export const getWebhookUrl = async (webhookKey: string): Promise<string> => {
    if (webhookCache[webhookKey]) return webhookCache[webhookKey];

    // Check Env first to be fast? No, DB should be source of truth.
    // But for resilience, we might want env as fallback.

    try {
        const { data, error } = await supabase
            .rpc('get_webhook_url', { webhook_key: webhookKey });

        if (!error && data) {
            webhookCache[webhookKey] = data;
            return data;
        }
    } catch (e) {
        console.warn('Failed to fetch webhook from DB, using fallback env');
    }

    return import.meta.env[webhookKey] || '';
};

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getWebhookUrl } from '@/hooks/useWebhookUrl';

interface GeneratePromptInput {
    agentName: string;
    agentDescription: string;
    companyName: string;
    companyDescription: string;
    productsServices: string;
    targetAudience: string;
    companyWebsite?: string;
    objective: string;
    tone: string;
    userInstructions: string;
}

interface GeneratedAgentConfig {
    agent_name: string;
    description: string;
    company: {
        name: string;
        description: string;
        website?: string;
    };
    products_services: string[];
    target_audience: string[];
    agent_purpose: string;
    tone_and_style: {
        tone: string;
        style: string;
        conversational_goals: string[];
    };
    operational_instructions: {
        channels: string[];
        behavior: string[];
        integration: string;
    };
}

interface GeneratePromptResponse {
    systemPrompt: string;
    welcomeMessage: string;
    agentConfig: GeneratedAgentConfig | null;
    rawJson: string;
}

export function useGeneratePrompt() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedConfig, setGeneratedConfig] = useState<GeneratedAgentConfig | null>(null);
    const { toast } = useToast();

    const generatePrompt = async (input: GeneratePromptInput): Promise<GeneratePromptResponse | null> => {
        const webhookUrl = await getWebhookUrl('VITE_N8N_WEBHOOK_URL');

        if (!webhookUrl) {
            toast({
                title: 'Error de Configuración',
                description: 'La URL del webhook de n8n no está configurada. Contacta al administrador.',
                variant: 'destructive',
            });
            return null;
        }

        setIsGenerating(true);

        try {
            console.log('🚀 Enviando a n8n:', input);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('📥 Respuesta de n8n (raw):', data);

            // Parsear la respuesta de n8n
            let agentConfig: GeneratedAgentConfig | null = null;
            let systemPrompt = '';
            let rawJson = '';

            // Caso 1: Array con output (formato que mostró el usuario)
            if (Array.isArray(data) && data.length > 0 && data[0]?.output) {
                console.log('📋 Formato detectado: Array con output');
                const outputStr = data[0].output;

                // Extraer JSON del markdown code block
                const jsonMatch = outputStr.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    rawJson = jsonMatch[1];
                    console.log('📋 JSON extraído del code block:', rawJson);
                    try {
                        agentConfig = JSON.parse(rawJson);
                    } catch (e) {
                        console.error('❌ Error parseando JSON del code block:', e);
                    }
                } else {
                    // Intentar parsear directamente
                    rawJson = outputStr;
                    try {
                        agentConfig = JSON.parse(outputStr);
                        console.log('📋 JSON parseado directamente');
                    } catch {
                        console.log('📋 No es JSON válido, usando como string');
                    }
                }
            }
            // Caso 2: Objeto con output
            else if (data && typeof data === 'object' && data.output) {
                console.log('📋 Formato detectado: Objeto con output');
                const outputStr = data.output;
                const jsonMatch = outputStr.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    rawJson = jsonMatch[1];
                    try {
                        agentConfig = JSON.parse(rawJson);
                    } catch (e) {
                        console.error('❌ Error parseando:', e);
                    }
                } else {
                    rawJson = outputStr;
                    try {
                        agentConfig = JSON.parse(outputStr);
                    } catch {
                        // No es JSON
                    }
                }
            }
            // Caso 3: El objeto ya es la config directamente
            else if (data && typeof data === 'object' && (data.agent_name || data.description || data.agent_purpose)) {
                console.log('📋 Formato detectado: Config directa');
                agentConfig = data as GeneratedAgentConfig;
                rawJson = JSON.stringify(data, null, 2);
            }
            // Caso 4: Formato antiguo con systemPrompt
            else if (data && typeof data === 'object' && (data.systemPrompt || data.system_prompt)) {
                console.log('📋 Formato detectado: Formato antiguo');
                systemPrompt = data.systemPrompt || data.system_prompt || '';
                rawJson = systemPrompt;
            }
            // Caso 5: String directo
            else if (typeof data === 'string') {
                console.log('📋 Formato detectado: String directo');
                rawJson = data;
                try {
                    agentConfig = JSON.parse(data);
                } catch {
                    systemPrompt = data;
                }
            }

            // Construir el systemPrompt final
            if (agentConfig) {
                systemPrompt = JSON.stringify(agentConfig, null, 2);
                setGeneratedConfig(agentConfig);
                console.log('✅ Config parseada correctamente');
            } else if (rawJson && !systemPrompt) {
                systemPrompt = rawJson;
                console.log('⚠️ Usando rawJson como systemPrompt');
            }

            console.log('📝 System Prompt final (primeros 200 chars):', systemPrompt.substring(0, 200));

            if (systemPrompt) {
                toast({
                    title: '¡Prompt Generado!',
                    description: 'La IA ha creado un prompt profesional para tu agente.',
                });
            } else {
                toast({
                    title: 'Respuesta Recibida',
                    description: 'Pero no se pudo extraer el prompt. Revisa la consola.',
                    variant: 'destructive',
                });
                console.error('❌ No se pudo extraer systemPrompt. Data completa:', JSON.stringify(data, null, 2));
            }

            return {
                systemPrompt,
                welcomeMessage: '',
                agentConfig,
                rawJson,
            };
        } catch (error) {
            console.error('❌ Error en generatePrompt:', error);
            toast({
                title: 'Error al Generar Prompt',
                description: error instanceof Error ? error.message : 'No se pudo conectar con n8n',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const clearGeneratedConfig = () => {
        setGeneratedConfig(null);
    };

    return {
        generatePrompt,
        isGenerating,
        generatedConfig,
        clearGeneratedConfig,
    };
}

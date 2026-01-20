import { supabase } from "@/integrations/supabase/client";
import { sendNewConversationEmail } from "./notifications";
import { getWebhookUrl } from "@/hooks/useWebhookUrl";

/**
 * Public Widget API
 * Functions for the embeddable chat widget (no authentication required)
 */

export interface WidgetConfig {
    agent: {
        id: string;
        name: string;
        avatar_url: string | null;
        welcome_message: string | null;
        widget_color: string | null;
        widget_position: string | null;
        require_email: boolean;
        fallback_email: string | null;
        fallback_message: string | null;
    };
    status: 'active' | 'paused' | 'draft' | 'archived';
}

export interface PublicMessage {
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export interface SendMessageRequest {
    visitor_id: string;
    message: string;
    visitor_info?: {
        name?: string;
        email?: string;
    };
}

export interface SendMessageResponse {
    response: string;
    conversation_id: string;
    status: 'success' | 'out_of_service' | 'error';
    fallback_email?: string;
}

/**
 * Get widget configuration for an agent
 */
export async function getWidgetConfig(agentId: string): Promise<WidgetConfig | null> {
    const { data, error } = await supabase
        .from('ah_agents')
        .select(`
      id,
      name,
      avatar_url,
      welcome_message,
      widget_color,
      widget_position,
      require_email,
      fallback_email,
      fallback_message,
      status
    `)
        .eq('id', agentId)
        .single();

    if (error || !data) {
        console.error('Error fetching widget config:', error);
        return null;
    }

    return {
        agent: data,
        status: data.status as 'active' | 'paused' | 'draft' | 'archived'
    };
}

/**
 * Send a message from a visitor and get agent response
 */
export async function sendPublicMessage(
    agentId: string,
    request: SendMessageRequest
): Promise<SendMessageResponse> {
    try {
        // 1. Get agent and owner info
        const { data: agent, error: agentError } = await supabase
            .from('ah_agents')
            .select('*, user_id')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            throw new Error('Agent not found');
        }

        // 2. Check if agent is active
        if (agent.status !== 'active') {
            return {
                response: agent.fallback_message || 'Este servicio está temporalmente fuera de línea.',
                conversation_id: '',
                status: 'out_of_service',
                fallback_email: agent.fallback_email || undefined
            };
        }

        // 3. Check owner's credits (skip for now to avoid RLS issues in public widget)
        // In production, this should use a server-side function or service_role key
        let hasCredits = true;

        try {
            const { data: credits, error } = await supabase
                .from('ah_credits')
                .select('balance')
                .eq('user_id', agent.user_id)
                .maybeSingle();

            console.log('[Widget] Credits check:', { credits, error });

            // Only block if we successfully got credits data and it's below 1
            if (credits && credits.balance < 1) {
                hasCredits = false;
            }
        } catch (error) {
            // If credits check fails due to RLS, allow the request to proceed
            // This prevents blocking legitimate users due to configuration issues
            console.warn('[Widget] Credits check failed, allowing request:', error);
        }

        if (!hasCredits) {
            // Pause agent automatically
            await supabase
                .from('ah_agents')
                .update({ status: 'paused' })
                .eq('id', agentId);

            return {
                response: agent.fallback_message || 'Este servicio está temporalmente fuera de línea.',
                conversation_id: '',
                status: 'out_of_service',
                fallback_email: agent.fallback_email || undefined
            };
        }

        // 4. Get or create conversation
        // Get the latest conversation for this visitor
        const { data: conversation, error: convError } = await supabase
            .from('ah_public_conversations')
            .select('id, status')
            .eq('agent_id', agentId)
            .eq('visitor_id', request.visitor_id)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let conversationId = conversation?.id;
        const conversationStatus = conversation?.status || 'active';

        // If conversation doesn't exist OR is resolved, create a new one
        if (!conversationId || conversationStatus === 'resolved') {
            // Create new conversation
            const { data: newConv, error: createError } = await supabase
                .from('ah_public_conversations')
                .insert({
                    agent_id: agentId,
                    visitor_id: request.visitor_id,
                    visitor_name: request.visitor_info?.name,
                    visitor_email: request.visitor_info?.email,
                    status: 'active'
                })
                .select('id')
                .single();

            if (createError || !newConv) {
                throw new Error('Failed to create conversation');
            }

            conversationId = newConv.id;

            // Notify agent owner about new conversation (fire-and-forget)
            try {
                const { data: ownerProfile } = await supabase
                    .from('ah_profiles')
                    .select('email, full_name')
                    .eq('user_id', agent.user_id)
                    .single();

                if (ownerProfile) {
                    // Non-blocking call - don't await to not slow down the visitor
                    sendNewConversationEmail(
                        ownerProfile.email,
                        ownerProfile.full_name || 'Usuario',
                        agent.user_id,
                        agent.name,
                        request.visitor_info?.name || 'Visitante anónimo',
                        request.visitor_info?.email || 'Sin email',
                        conversationId
                    ).catch(err => console.error('[Widget] Error sending new conversation email:', err));
                }
            } catch (notifyError) {
                // Don't fail the conversation if notification fails
                console.error('[Widget] Error notifying owner:', notifyError);
            }
        }

        // 5. Save user message
        await supabase
            .from('ah_public_messages')
            .insert({
                conversation_id: conversationId,
                role: 'user',
                content: request.message
            });

        // 5.5 Check if conversation (the one we are using/created) is in human_takeover
        // Note: A newly created conversation will be 'active', so this only applies if we resumed an existing one
        if (conversationStatus === 'human_takeover' && conversation?.id === conversationId) {
            // Don't send a response message - just acknowledge the message was received
            return {
                response: '', // Empty - no automatic response in human mode
                conversation_id: conversationId,
                status: 'human_takeover' as any  // Special status for widget to show indicator
            };
        }

        // 6. Call n8n webhook for AI response
        const webhookUrl = await getWebhookUrl('VITE_N8N_CHAT_WEBHOOK_URL');
        if (!webhookUrl) {
            console.error('[Widget] Webhook URL not configured');
            throw new Error('Webhook URL not configured');
        }

        const sessionId = `${agentId}_${request.visitor_id}`;
        const webhookPayload = {
            agentId: sessionId,
            agentName: agent.name,
            tableName: `embeddings_${agentId.split('-').join('_')}`,
            message: request.message,
            systemPrompt: agent.system_prompt || ''
        };

        console.log('[Widget] Calling webhook:', webhookUrl);
        console.log('[Widget] Payload:', webhookPayload);

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });

        console.log('[Widget] Webhook response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Widget] Webhook error:', errorText);
            throw new Error(`Failed to get AI response: ${response.status}`);
        }

        const data = await response.json();
        console.log('[Widget] Webhook response data:', data);
        const aiResponse = data.output || data.response || data.message || 'Sin respuesta';

        // 7. Save AI message
        await supabase
            .from('ah_public_messages')
            .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: aiResponse
            });

        // 8. Consume credits from owner
        await supabase
            .from('ah_usage_logs')
            .insert({
                user_id: agent.user_id,
                amount: 1,
                description: `Public chat - Agent: ${agent.name}`
            });

        // Note: Credits balance update is handled by database triggers or server-side functions
        // to avoid RLS permission issues in public widget context

        return {
            response: aiResponse,
            conversation_id: conversationId,
            status: 'success'
        };

    } catch (error) {
        console.error('Error sending public message:', error);
        return {
            response: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo más tarde.',
            conversation_id: '',
            status: 'error'
        };
    }
}

/**
 * Get conversation history for a visitor
 */
export async function getConversationHistory(
    agentId: string,
    visitorId: string
): Promise<PublicMessage[]> {
    const { data: conversation } = await supabase
        .from('ah_public_conversations')
        .select('id')
        .eq('agent_id', agentId)
        .eq('visitor_id', visitorId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!conversation) {
        return [];
    }

    const { data: messages, error } = await supabase
        .from('ah_public_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

    if (error || !messages) {
        return [];
    }

    return messages as PublicMessage[];
}

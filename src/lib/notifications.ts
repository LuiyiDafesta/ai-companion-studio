import { supabase } from '@/integrations/supabase/client';
import { generateEmailPayload } from './emailTemplates';

/**
 * Send email via n8n webhook
 */
const sendEmail = async (webhookUrl: string, payload: any) => {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
};

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = async (email: string, name: string, userId: string) => {
    const webhookUrl = import.meta.env.VITE_N8N_EMAIL_WELCOME_WEBHOOK;
    if (!webhookUrl) {
        console.warn('Welcome email webhook not configured');
        return { success: false };
    }

    // Check if user has this notification enabled
    const { data: settings } = await supabase
        .from('user_settings')
        .select('email_welcome')
        .eq('user_id', userId)
        .single();

    if (settings && !settings.email_welcome) {
        console.log('Welcome email disabled for user');
        return { success: false };
    }

    const payload = generateEmailPayload('welcome', { email, name, userId });
    return sendEmail(webhookUrl, payload);
};

/**
 * Send new message notification to agent owner
 */
export const sendNewMessageEmail = async (
    ownerEmail: string,
    ownerName: string,
    ownerId: string,
    agentName: string,
    visitorName: string,
    visitorEmail: string,
    message: string,
    conversationId: string
) => {
    const webhookUrl = import.meta.env.VITE_N8N_EMAIL_NEW_MESSAGE_WEBHOOK;
    if (!webhookUrl) {
        console.warn('New message email webhook not configured');
        return { success: false };
    }

    // Check if user has this notification enabled
    const { data: settings } = await supabase
        .from('user_settings')
        .select('email_new_message')
        .eq('user_id', ownerId)
        .single();

    if (settings && !settings.email_new_message) {
        console.log('New message email disabled for user');
        return { success: false };
    }

    const payload = generateEmailPayload('new_message', {
        email: ownerEmail,
        ownerName,
        agentName,
        visitorName,
        visitorEmail,
        message,
        conversationId
    });

    return sendEmail(webhookUrl, payload);
};

/**
 * Send new conversation notification to agent owner
 */
export const sendNewConversationEmail = async (
    ownerEmail: string,
    ownerName: string,
    ownerId: string,
    agentName: string,
    visitorName: string,
    visitorEmail: string,
    conversationId: string
) => {
    const webhookUrl = import.meta.env.VITE_N8N_EMAIL_NEW_CONVERSATION_WEBHOOK;
    if (!webhookUrl) {
        console.warn('New conversation email webhook not configured');
        return { success: false };
    }

    // Check if user has notifications enabled (reuse new_message setting or use a separate one)
    const { data: settings } = await supabase
        .from('user_settings')
        .select('email_new_message')
        .eq('user_id', ownerId)
        .single();

    if (settings && !settings.email_new_message) {
        console.log('New conversation email disabled for user');
        return { success: false };
    }

    const payload = generateEmailPayload('new_conversation', {
        email: ownerEmail,
        ownerName,
        agentName,
        visitorName,
        visitorEmail,
        conversationId
    });

    return sendEmail(webhookUrl, payload);
};

/**
 * Send low credits alert
 */
export const sendLowCreditsEmail = async (
    email: string,
    name: string,
    userId: string,
    balance: number,
    threshold: number
) => {
    const webhookUrl = import.meta.env.VITE_N8N_EMAIL_LOW_CREDITS_WEBHOOK;
    if (!webhookUrl) {
        console.warn('Low credits email webhook not configured');
        return { success: false };
    }

    // Check if user has this notification enabled
    const { data: settings } = await supabase
        .from('user_settings')
        .select('email_low_credits')
        .eq('user_id', userId)
        .single();

    if (settings && !settings.email_low_credits) {
        console.log('Low credits email disabled for user');
        return { success: false };
    }

    const payload = generateEmailPayload('low_credits', {
        email,
        name,
        balance,
        threshold
    });

    return sendEmail(webhookUrl, payload);
};

/**
 * Send marketing email (only to opted-in users)
 */
export const sendMarketingEmail = async (
    email: string,
    name: string,
    userId: string,
    subject: string,
    content: string,
    ctaText: string,
    ctaUrl: string
) => {
    const webhookUrl = import.meta.env.VITE_N8N_EMAIL_MARKETING_WEBHOOK;
    if (!webhookUrl) {
        console.warn('Marketing email webhook not configured');
        return { success: false };
    }

    // Check if user has opted in to marketing
    const { data: settings } = await supabase
        .from('user_settings')
        .select('email_marketing')
        .eq('user_id', userId)
        .single();

    if (!settings || !settings.email_marketing) {
        console.log('Marketing email disabled for user');
        return { success: false };
    }

    const payload = generateEmailPayload('marketing', {
        email,
        name,
        subject,
        content,
        ctaText,
        ctaUrl
    });

    return sendEmail(webhookUrl, payload);
};


/**
 * Send weekly report with stats
 */
export const sendWeeklyReport = async (userId: string, options: { skipCheck?: boolean, testMode?: boolean } = {}) => {
    const webhookUrl = import.meta.env.VITE_N8N_EMAIL_WEEKLY_REPORT_WEBHOOK;
    if (!webhookUrl) {
        console.warn('Weekly report email webhook not configured');
        return { success: false };
    }

    try {
        if (options.testMode) {
            console.log('Sending test weekly report...');
            const payload = generateEmailPayload('weekly_report', {
                email: 'test@example.com',
                name: 'Usuario de Prueba',
                startDate: new Date().toLocaleDateString(),
                endDate: new Date().toLocaleDateString(),
                totalConversations: 12,
                totalMessages: 156,
                activeAgents: 3,
                topAgentName: 'Agente de Ventas',
                topAgentConversations: 8
            });
            return sendEmail(webhookUrl, payload);
        }

        // 1. Check settings (unless skipped)
        if (!options.skipCheck) {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('email_weekly_report')
                .eq('user_id', userId)
                .single();

            if (!settings || !settings.email_weekly_report) {
                console.log('Weekly report disabled for user');
                return { success: false };
            }
        }

        // 2. Get user profile
        const { data: profile } = await supabase
            .from('ah_profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single();

        if (!profile) return { success: false, error: 'Profile not found' };

        // 3. Gather stats (Last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Get conversations
        const { data: conversations } = await supabase
            .from('ah_conversations')
            .select('*, agent:ah_agents(name)')
            .eq('user_id', userId)
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString());

        const totalConversations = conversations?.length || 0;

        // Calculate total messages (sum of messages_count or approximation)
        const totalMessages = conversations?.reduce((acc, curr) => acc + (curr.messages_count || 0), 0) || 0;

        // Active agents count
        const { count: activeAgents } = await supabase
            .from('ah_agents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active');

        // Find top agent
        const agentCounts: Record<string, number> = {};
        conversations?.forEach((c: any) => {
            const agentName = c.agent?.name || 'Agente desconocido';
            agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
        });

        let topAgentName = 'Ninguno';
        let topAgentConversations = 0;

        Object.entries(agentCounts).forEach(([name, count]) => {
            if (count > topAgentConversations) {
                topAgentName = name;
                topAgentConversations = count;
            }
        });

        // 4. Send email
        const payload = generateEmailPayload('weekly_report', {
            email: profile.email,
            name: profile.full_name || 'Usuario',
            startDate: startDate.toLocaleDateString(),
            endDate: endDate.toLocaleDateString(),
            totalConversations,
            totalMessages,
            activeAgents: activeAgents || 0,
            topAgentName,
            topAgentConversations
        });

        return sendEmail(webhookUrl, payload);

    } catch (error) {
        console.error('Error sending weekly report:', error);
        return { success: false, error };
    }
};

/**
 * Check credits and send alert if below threshold
 */
export const checkAndNotifyLowCredits = async (userId: string) => {
    try {
        // Get user settings
        const { data: settings } = await supabase
            .from('user_settings')
            .select('low_credits_threshold, email_low_credits')
            .eq('user_id', userId)
            .single();

        if (!settings || !settings.email_low_credits) {
            return;
        }

        // Get user credits
        const { data: credits } = await supabase
            .from('ah_credits')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (!credits) return;

        // Check if below threshold
        if (credits.balance < settings.low_credits_threshold) {
            // Get user info
            const { data: profile } = await supabase
                .from('ah_profiles')
                .select('email, full_name')
                .eq('id', userId)
                .single();

            if (profile) {
                await sendLowCreditsEmail(
                    profile.email,
                    profile.full_name || 'Usuario',
                    userId,
                    credits.balance,
                    settings.low_credits_threshold
                );
            }
        }
    } catch (error) {
        console.error('Error checking low credits:', error);
    }
};

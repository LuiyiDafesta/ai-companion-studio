
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.lsnetinformatica.com.ar'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkConfig() {
    console.log('Checking Webhook Config for: VITE_N8N_CHAT_WEBHOOK_URL')

    let webhookUrl = '';

    try {
        const { data, error } = await supabase
            .rpc('get_webhook_url', { webhook_key: 'VITE_N8N_CHAT_WEBHOOK_URL' })

        if (error) {
            console.error('RPC Error:', error.message)
        } else {
            console.log('RPC Result:', data)
            webhookUrl = data;
        }

    } catch (err) {
        console.error(err)
    }


    // 4. Check Last 5 Public Messages
    console.log('\n--- Recent Public Messages ---')
    const { data: messages, error: msgError } = await supabase
        .from('ah_public_messages')
        .select('role, content, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    if (msgError) {
        console.log('Error fetching messages:', msgError.message)
    } else {
        messages?.reverse().forEach(msg => {
            console.log(`[${msg.created_at}] ${msg.role}: ${msg.content.substring(0, 50)}...`)
        })
    }

    console.log('--------------------------------------------\n')

    if (webhookUrl) {
        console.log('\n--- Testing Webhook Connection ---')
        console.log('Target URL:', webhookUrl)

        try {
            const payload = {
                agentId: 'test-agent-id',
                agentName: 'Test Agent',
                tableName: 'embeddings_test',
                message: 'Hello from verification script',
                systemPrompt: 'You are a test.'
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })


            console.log('Response Status:', response.status)
            console.log('Response Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2))
            const text = await response.text()
            console.log('Response Body:', text)

        } catch (fetchErr) {
            console.error('Fetch Failed:', fetchErr)
        }
    }
}

checkConfig()

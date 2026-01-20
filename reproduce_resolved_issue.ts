
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.lsnetinformatica.com.ar'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Known visitor with resolved conversation from previous check
// [2026-01-14T13:46:49...] ID: ceb43eb4... | Status: resolved | Visitor: 68c4469e-1ffa-446a-ad78-1a1dc05a29a6
const VISITOR_ID = '68c4469e-1ffa-446a-ad78-1a1dc05a29a6'
// Use the agent_id presumably associated with this visitor or fetch one.
// The check_conversations.ts didn't log agent_id, let's fetch it first.

async function reproduceIssue() {
    console.log('--- Reproduction Script ---')

    // 1. Get the latest conversation to confirm it's resolved and get agent_id
    console.log('1. Fetching latest conversation...')
    const { data: conv, error: fetchError } = await supabase
        .from('ah_public_conversations')
        .select('*')
        .eq('visitor_id', VISITOR_ID)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

    if (fetchError) {
        console.error('Error fetching conversation:', fetchError.message)
        return
    }

    console.log(`Latest Conversation: ID=${conv.id}, Status=${conv.status}, Agent=${conv.agent_id}`)

    if (conv.status !== 'resolved') {
        console.log('WARNING: Latest conversation is not resolved. Test might not be valid.')
    }

    // 2. Try to create a NEW conversation (simulating widget logic)
    console.log('2. Attempting to create NEW conversation...')
    const { data: newConv, error: createError } = await supabase
        .from('ah_public_conversations')
        .insert({
            agent_id: conv.agent_id,
            visitor_id: VISITOR_ID,
            visitor_name: 'Reproduction Test User',
            visitor_email: 'test@example.com',
            status: 'active'
        })
        .select()

    if (createError) {
        console.error('>>> FAILURE CREATING CONVERSATION <<<')
        console.error('Error Code:', createError.code)
        console.error('Error Message:', createError.message)
        console.error('Error Details:', createError.details)
    } else {
        console.log('>>> SUCCESS <<<')
        console.log('New Conversation Created:', newConv)
    }
}

reproduceIssue()

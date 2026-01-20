
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.lsnetinformatica.com.ar'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)


async function checkConversations() {
    console.log('Checking Recent Public Conversations (using started_at)...')

    // Check last 10 conversations
    const { data: convs, error } = await supabase
        .from('ah_public_conversations')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error:', error.message)
        return
    }

    if (!convs || convs.length === 0) {
        console.log('No conversations found.')
        return
    }

    console.log(`Found ${convs.length} recent conversations:`)
    convs.forEach(c => {
        console.log(`[${c.started_at}] ID: ${c.id}`)
        console.log(`   Status: ${c.status}`)
        console.log(`   Visitor: ${c.visitor_id}`)
        console.log('---')
    })
}

checkConversations()

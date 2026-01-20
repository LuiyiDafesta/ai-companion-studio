
import pg from 'pg'
const { Client } = pg

// Usage: set DATABASE_URL=postgres://user:pass@host:port/postgres before running
// Example: $env:DATABASE_URL="postgres://postgres:password@localhost:5432/postgres"; npx tsx apply_migration.ts

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set.')
    console.error('Please run with: $env:DATABASE_URL="your_connection_string"; npx tsx apply_migration.ts')
    process.exit(1)
}

const client = new Client({
    connectionString,
})

async function runMigration() {
    try {
        await client.connect()
        console.log('Connected to database.')

        console.log('Dropping constraint ah_public_conversations_agent_id_visitor_id_key...')
        await client.query(`
            ALTER TABLE ah_public_conversations
            DROP CONSTRAINT IF EXISTS ah_public_conversations_agent_id_visitor_id_key;
        `)

        console.log('Creating index idx_ah_public_conversations_agent_visitor...')
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_ah_public_conversations_agent_visitor 
            ON ah_public_conversations(agent_id, visitor_id);
        `)

        console.log('Migration completed successfully!')

    } catch (err: any) {
        console.error('Migration failed:', err)
    } finally {
        await client.end()
    }
}

runMigration()

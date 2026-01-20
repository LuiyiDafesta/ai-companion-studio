-- Migration to allow multiple conversations per agent-visitor pair
-- Run this in your Supabase SQL Editor

-- 1. Drop the unique constraint that blocks new conversations
ALTER TABLE ah_public_conversations
DROP CONSTRAINT IF EXISTS ah_public_conversations_agent_id_visitor_id_key;

-- 2. Add an index to keep queries fast (since we lost the unique index)
CREATE INDEX IF NOT EXISTS idx_ah_public_conversations_agent_visitor 
ON ah_public_conversations(agent_id, visitor_id);

-- 3. (Optional) Verify it's gone
SELECT count(*) 
FROM pg_constraint 
WHERE conname = 'ah_public_conversations_agent_id_visitor_id_key';

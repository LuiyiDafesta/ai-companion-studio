-- Migration: Create Public Conversations System
-- Description: Tables for embeddable chat widget conversations

-- Table: ah_public_conversations
-- Stores conversations from visitors on embedded widgets
CREATE TABLE ah_public_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ah_agents(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  messages_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  UNIQUE(agent_id, visitor_id)
);

-- Indexes for performance
CREATE INDEX idx_public_conv_agent ON ah_public_conversations(agent_id);
CREATE INDEX idx_public_conv_visitor ON ah_public_conversations(visitor_id);
CREATE INDEX idx_public_conv_email ON ah_public_conversations(visitor_email) WHERE visitor_email IS NOT NULL;
CREATE INDEX idx_public_conv_status ON ah_public_conversations(status);
CREATE INDEX idx_public_conv_last_message ON ah_public_conversations(last_message_at DESC);

-- Table: ah_public_messages
-- Stores individual messages in public conversations
CREATE TABLE ah_public_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ah_public_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_public_msg_conv ON ah_public_messages(conversation_id);
CREATE INDEX idx_public_msg_created ON ah_public_messages(created_at DESC);

-- Add columns to ah_agents for widget configuration
ALTER TABLE ah_agents 
  ADD COLUMN IF NOT EXISTS fallback_email TEXT,
  ADD COLUMN IF NOT EXISTS fallback_message TEXT DEFAULT 'Este servicio está temporalmente fuera de línea. Por favor, inténtelo más tarde.',
  ADD COLUMN IF NOT EXISTS crm_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS crm_webhook_events TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS widget_primary_color TEXT DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS widget_position TEXT DEFAULT 'bottom-right' CHECK (widget_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT '¡Hola! ¿En qué puedo ayudarte?',
  ADD COLUMN IF NOT EXISTS require_email BOOLEAN DEFAULT true;

-- RLS Policies for ah_public_conversations
ALTER TABLE ah_public_conversations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view conversations for their own agents
CREATE POLICY "Users can view conversations for their agents"
ON ah_public_conversations
FOR SELECT
TO authenticated
USING (
  agent_id IN (
    SELECT id FROM ah_agents WHERE user_id = auth.uid()
  )
);

-- Allow public insert (for widget usage)
CREATE POLICY "Public can insert conversations"
ON ah_public_conversations
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public update (for updating conversation metadata)
CREATE POLICY "Public can update their conversations"
ON ah_public_conversations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- RLS Policies for ah_public_messages
ALTER TABLE ah_public_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view messages for their agents' conversations
CREATE POLICY "Users can view messages for their agents"
ON ah_public_messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT c.id FROM ah_public_conversations c
    JOIN ah_agents a ON c.agent_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Allow public insert (for widget usage)
CREATE POLICY "Public can insert messages"
ON ah_public_messages
FOR INSERT
TO public
WITH CHECK (true);

-- Function to update last_message_at and messages_count
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ah_public_conversations
  SET 
    last_message_at = NOW(),
    messages_count = messages_count + 1
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation stats
CREATE TRIGGER trigger_update_conversation_stats
AFTER INSERT ON ah_public_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_stats();

-- Comments for documentation
COMMENT ON TABLE ah_public_conversations IS 'Stores conversations from visitors using embedded chat widgets';
COMMENT ON TABLE ah_public_messages IS 'Individual messages in public widget conversations';
COMMENT ON COLUMN ah_public_conversations.visitor_id IS 'Unique identifier for the visitor (UUID stored in localStorage)';
COMMENT ON COLUMN ah_public_conversations.visitor_metadata IS 'Additional visitor data (IP, user agent, location, etc.)';
COMMENT ON COLUMN ah_agents.fallback_email IS 'Contact email shown when agent is out of service';
COMMENT ON COLUMN ah_agents.crm_webhook_url IS 'Optional webhook URL to send conversation data to external CRM';

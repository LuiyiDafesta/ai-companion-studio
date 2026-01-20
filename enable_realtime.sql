-- Enable Realtime for the 'ah_conversations' table
ALTER PUBLICATION supabase_realtime ADD TABLE ah_conversations;

-- Enable Realtime for the 'ah_messages' table
ALTER PUBLICATION supabase_realtime ADD TABLE ah_messages;

-- Enable Realtime for the 'ah_public_conversations' table
ALTER PUBLICATION supabase_realtime ADD TABLE ah_public_conversations;

-- Enable Realtime for the 'ah_public_messages' table
ALTER PUBLICATION supabase_realtime ADD TABLE ah_public_messages;

-- Optional: Verify that the tables are in the publication (for debugging)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

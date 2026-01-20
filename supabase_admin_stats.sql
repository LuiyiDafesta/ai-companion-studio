CREATE OR REPLACE FUNCTION get_admin_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users bigint;
  total_agents bigint;
  active_agents bigint;
  draft_agents bigint;
  total_conversations bigint;
  total_messages bigint;
  total_tokens bigint;
  total_credits_used bigint;
BEGIN
  -- Validate Admin Role (Optional: remove comment to enforce)
  -- IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
  --   RAISE EXCEPTION 'Access denied';
  -- END IF;

  -- 1. Users (from profiles to match app logic)
  SELECT count(*) INTO total_users FROM public.ah_profiles;

  -- 2. Agents Stats
  SELECT count(*) INTO total_agents FROM public.ah_agents;
  SELECT count(*) INTO active_agents FROM public.ah_agents WHERE status = 'active';
  SELECT count(*) INTO draft_agents FROM public.ah_agents WHERE status = 'draft';

  -- 3. Conversations & Tokens
  SELECT count(*) INTO total_conversations FROM public.ah_conversations;
  SELECT sum(coalesce(tokens_used, 0)) INTO total_tokens FROM public.ah_conversations;

  -- 4. Total Messages
  SELECT count(*) INTO total_messages FROM public.ah_messages;

  -- 5. Credits
  SELECT sum(coalesce(total_used, 0)) INTO total_credits_used FROM public.credits;

  RETURN json_build_object(
    'totalUsers', total_users,
    'totalAgents', total_agents,
    'activeAgents', active_agents,
    'draftAgents', draft_agents,
    'totalConversations', total_conversations,
    'totalMessages', total_messages,
    'totalTokens', coalesce(total_tokens, 0),
    'totalCreditsUsed', coalesce(total_credits_used, 0)
  );
END;
$$;

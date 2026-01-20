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
  
  recent_users json;
  recent_agents json;
  top_agents json;
BEGIN
  -- 1. Counters
  SELECT count(*) INTO total_users FROM public.ah_profiles;
  SELECT count(*) INTO total_agents FROM public.ah_agents;
  SELECT count(*) INTO active_agents FROM public.ah_agents WHERE status = 'active';
  SELECT count(*) INTO draft_agents FROM public.ah_agents WHERE status = 'draft';
  
  SELECT count(*) INTO total_conversations FROM public.ah_conversations;
  
  -- CHANGED: Sum messages_count from conversations instead of counting ah_messages rows
  -- This ensures consistency with the "Total Conversations" count
  SELECT sum(coalesce(messages_count, 0)) INTO total_messages FROM public.ah_conversations;
  
  SELECT sum(coalesce(tokens_used, 0)) INTO total_tokens FROM public.ah_conversations;

  -- Credits from usage logs
  SELECT coalesce(sum(amount), 0) INTO total_credits_used FROM public.ah_usage_logs;

  -- 2. Recent Users (Last 5)
  SELECT json_agg(t) INTO recent_users FROM (
    SELECT email, created_at 
    FROM public.ah_profiles 
    ORDER BY created_at DESC 
    LIMIT 5
  ) t;

  -- 3. Recent Agents (Last 5)
  SELECT json_agg(t) INTO recent_agents FROM (
    SELECT name, created_at, user_id 
    FROM public.ah_agents 
    ORDER BY created_at DESC 
    LIMIT 5
  ) t;

  -- 4. Top Agents by Conversations (Top 5)
  SELECT json_agg(t) INTO top_agents FROM (
    SELECT a.name, count(c.id) as conversations_count
    FROM public.ah_agents a
    LEFT JOIN public.ah_conversations c ON a.id = c.agent_id
    GROUP BY a.id, a.name
    ORDER BY conversations_count DESC
    LIMIT 5
  ) t;

  RETURN json_build_object(
    'totalUsers', total_users,
    'totalAgents', total_agents,
    'activeAgents', active_agents,
    'draftAgents', draft_agents,
    'totalConversations', total_conversations,
    'totalMessages', coalesce(total_messages, 0),
    'totalTokens', coalesce(total_tokens, 0),
    'totalCreditsUsed', coalesce(total_credits_used, 0),
    'recentUsers', coalesce(recent_users, '[]'::json),
    'recentAgents', coalesce(recent_agents, '[]'::json),
    'topAgents', coalesce(top_agents, '[]'::json)
  );
END;
$$;

-- RPC to get all conversations for admin metrics (bypasses RLS)
CREATE OR REPLACE FUNCTION get_admin_conversations(start_date timestamp with time zone)
RETURNS SETOF ah_conversations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.ah_conversations
  WHERE started_at >= start_date
  ORDER BY started_at ASC;
END;
$$;

-- Alternative: Get aggregated admin metrics directly
CREATE OR REPLACE FUNCTION get_admin_metrics(start_date timestamp with time zone)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_conversations int;
  total_messages int;
  total_tokens int;
  human_takeover_count int;
  resolved_count int;
  active_count int;
  total_credits_used numeric;
  trends_data json;
BEGIN
  -- Count conversations
  SELECT count(*), 
         coalesce(sum(messages_count), 0),
         coalesce(sum(tokens_used), 0),
         count(*) FILTER (WHERE status = 'human_takeover'),
         count(*) FILTER (WHERE status = 'resolved' OR status = 'closed'),
         count(*) FILTER (WHERE status = 'active')
  INTO total_conversations, total_messages, total_tokens, human_takeover_count, resolved_count, active_count
  FROM public.ah_conversations
  WHERE started_at >= start_date;

  -- Get credit usage
  SELECT coalesce(sum(amount), 0) INTO total_credits_used
  FROM public.ah_usage_logs
  WHERE created_at >= start_date;

  -- Build daily trends
  SELECT json_agg(t) INTO trends_data FROM (
    SELECT 
      to_char(started_at::date, 'Mon DD') as date,
      count(*) as conversations,
      coalesce(sum(messages_count), 0) as messages,
      coalesce(sum(tokens_used), 0) as tokens
    FROM public.ah_conversations
    WHERE started_at >= start_date
    GROUP BY started_at::date
    ORDER BY started_at::date
  ) t;

  -- Build result
  result := json_build_object(
    'totalConversations', total_conversations,
    'totalMessages', total_messages,
    'totalTokens', total_tokens,
    'humanTakeoverCount', human_takeover_count,
    'resolvedCount', resolved_count,
    'activeCount', active_count,
    'totalCreditsUsed', total_credits_used,
    'trendsData', coalesce(trends_data, '[]'::json)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_user_agents(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if caller is admin (optional, but good practice if not using explicit RLS on the function itself)
  -- For now, we rely on the app logic, but SECURITY DEFINER allows it.
  
  SELECT json_agg(t) INTO result FROM (
    SELECT 
      id, 
      name, 
      description, 
      status, 
      avatar_url, 
      created_at, 
      (SELECT count(*) FROM public.ah_conversations WHERE agent_id = a.id) as conversations_count
    FROM public.ah_agents a
    WHERE user_id = target_user_id
    ORDER BY created_at DESC
  ) t;

  RETURN coalesce(result, '[]'::json);
END;
$$;

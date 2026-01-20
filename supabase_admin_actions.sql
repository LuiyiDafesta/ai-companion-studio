-- RPC to toggle agent status (e.g. active <-> paused)
CREATE OR REPLACE FUNCTION admin_update_agent_status(target_agent_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ah_agents
  SET status = new_status
  WHERE id = target_agent_id;
END;
$$;

-- RPC to delete an agent
CREATE OR REPLACE FUNCTION admin_delete_agent(target_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete related records if not properly cascaded (though foreign keys should handle this usually)
  -- But for safety/completeness we can just rely on cascade or delete manually if needed.
  -- Assuming ON DELETE CASCADE in schema for messages/conversations.
  
  DELETE FROM public.ah_agents
  WHERE id = target_agent_id;
END;
$$;

-- RPC to get full agent details for admin
CREATE OR REPLACE FUNCTION admin_get_agent_details(target_agent_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT row_to_json(a) INTO result
  FROM public.ah_agents a
  WHERE id = target_agent_id;
  
  RETURN result;
END;
$$;

-- ============================================
-- USER BACKUP SQL FUNCTION
-- Export all data for a specific user
-- ============================================

CREATE OR REPLACE FUNCTION user_export_my_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  current_user_id uuid;
  agent_ids uuid[];
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get agent IDs for this user
  SELECT array_agg(id) INTO agent_ids
  FROM public.ah_agents
  WHERE user_id = current_user_id;

  -- Build the user's backup
  result := json_build_object(
    'backup_version', '1.0',
    'backup_type', 'user',
    'backup_date', now(),
    'user_id', current_user_id,
    'data', json_build_object(
      'profile', (
        SELECT row_to_json(t) FROM (
          SELECT * FROM public.ah_profiles WHERE user_id = current_user_id
        ) t
      ),
      'agents', (
        SELECT COALESCE(json_agg(t), '[]'::json) 
        FROM public.ah_agents t 
        WHERE user_id = current_user_id
      ),
      'documents', (
        SELECT COALESCE(json_agg(t), '[]'::json) 
        FROM public.ah_documents t 
        WHERE agent_id = ANY(agent_ids)
      ),
      'conversations', (
        SELECT COALESCE(json_agg(t), '[]'::json) 
        FROM public.ah_conversations t 
        WHERE user_id = current_user_id
      ),
      'messages', (
        SELECT COALESCE(json_agg(m), '[]'::json) 
        FROM public.ah_messages m
        INNER JOIN public.ah_conversations c ON m.conversation_id = c.id
        WHERE c.user_id = current_user_id
      ),
      'public_conversations', (
        SELECT COALESCE(json_agg(t), '[]'::json) 
        FROM public.ah_public_conversations t 
        WHERE agent_id = ANY(agent_ids)
      ),
      'public_messages', (
        SELECT COALESCE(json_agg(m), '[]'::json) 
        FROM public.ah_public_messages m
        INNER JOIN public.ah_public_conversations c ON m.conversation_id = c.id
        WHERE c.agent_id = ANY(agent_ids)
      ),
      'credits', (
        SELECT row_to_json(t) FROM (
          SELECT * FROM public.ah_credits WHERE user_id = current_user_id
        ) t
      ),
      'usage_logs', (
        SELECT COALESCE(json_agg(t), '[]'::json) 
        FROM public.ah_usage_logs t 
        WHERE user_id = current_user_id
      ),
      'subscription', (
        SELECT row_to_json(t) FROM (
          SELECT * FROM public.ah_subscriptions WHERE user_id = current_user_id
        ) t
      ),
      'settings', (
        SELECT row_to_json(t) FROM (
          SELECT * FROM public.user_settings WHERE user_id = current_user_id
        ) t
      ),
      'api_tokens', (
        SELECT COALESCE(json_agg(json_build_object(
          'name', name,
          'created_at', created_at,
          'last_used_at', last_used_at
        )), '[]'::json) 
        FROM public.api_tokens 
        WHERE user_id = current_user_id AND revoked_at IS NULL
      )
    )
  );

  RETURN result;
END;
$$;

-- ============================================
-- USER DELETE ACCOUNT FUNCTION
-- Delete all data for the current user
-- ============================================

CREATE OR REPLACE FUNCTION user_delete_my_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  agent_ids uuid[];
  embedding_tables text[];
  tbl text;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get agent IDs for this user
  SELECT array_agg(id) INTO agent_ids
  FROM public.ah_agents
  WHERE user_id = current_user_id;

  -- Delete in order (respecting foreign keys)
  
  -- 1. Messages
  DELETE FROM public.ah_messages 
  WHERE conversation_id IN (
    SELECT id FROM public.ah_conversations WHERE user_id = current_user_id
  );
  
  IF agent_ids IS NOT NULL THEN
    DELETE FROM public.ah_public_messages 
    WHERE conversation_id IN (
      SELECT id FROM public.ah_public_conversations WHERE agent_id = ANY(agent_ids)
    );
  END IF;
  
  -- 2. Conversations
  DELETE FROM public.ah_conversations WHERE user_id = current_user_id;
  
  IF agent_ids IS NOT NULL THEN
    DELETE FROM public.ah_public_conversations WHERE agent_id = ANY(agent_ids);
  END IF;
  
  -- 3. Documents
  IF agent_ids IS NOT NULL THEN
    DELETE FROM public.ah_documents WHERE agent_id = ANY(agent_ids);
  END IF;
  
  -- 4. Drop embedding tables for user's agents
  IF agent_ids IS NOT NULL THEN
    FOR tbl IN 
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'embeddings_%'
      AND substring(tablename from 12) = ANY(
        SELECT replace(id::text, '-', '_') FROM unnest(agent_ids) AS id
      )
    LOOP
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', tbl);
    END LOOP;
  END IF;
  
  -- 5. Agents
  DELETE FROM public.ah_agents WHERE user_id = current_user_id;
  
  -- 6. Usage logs
  DELETE FROM public.ah_usage_logs WHERE user_id = current_user_id;
  
  -- 7. API tokens
  DELETE FROM public.api_tokens WHERE user_id = current_user_id;
  
  -- 8. Credits and subscriptions
  DELETE FROM public.ah_credits WHERE user_id = current_user_id;
  DELETE FROM public.ah_subscriptions WHERE user_id = current_user_id;
  
  -- 9. Settings
  DELETE FROM public.user_settings WHERE user_id = current_user_id;
  
  -- 10. User roles
  DELETE FROM public.user_roles WHERE user_id = current_user_id;
  
  -- 11. Profile
  DELETE FROM public.ah_profiles WHERE user_id = current_user_id;

  -- Note: The auth.users record should be deleted via Supabase Admin API
  -- This function only cleans up the public schema data

  RETURN json_build_object(
    'success', true,
    'message', 'Account data deleted successfully',
    'user_id', current_user_id
  );
END;
$$;

-- ============================================
-- USER RESTORE DATA FUNCTION
-- Restore user data from a backup JSON
-- ============================================

CREATE OR REPLACE FUNCTION user_restore_my_data(backup_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  restore_data json;
  agent_record json;
  doc_record json;
  conv_record json;
  msg_record json;
  agents_count int := 0;
  docs_count int := 0;
  convs_count int := 0;
  msgs_count int := 0;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate backup format
  IF backup_data->>'backup_type' != 'user' THEN
    RAISE EXCEPTION 'Invalid backup type. Expected user backup.';
  END IF;

  restore_data := backup_data->'data';

  -- Restore profile
  IF restore_data->'profile' IS NOT NULL AND restore_data->>'profile' != 'null' THEN
    UPDATE public.ah_profiles
    SET 
      full_name = COALESCE((restore_data->'profile'->>'full_name'), full_name),
      company_name = COALESCE((restore_data->'profile'->>'company_name'), company_name),
      company_website = COALESCE((restore_data->'profile'->>'company_website'), company_website),
      phone = COALESCE((restore_data->'profile'->>'phone'), phone)
    WHERE user_id = current_user_id;
  END IF;

  -- Restore agents (simplified - only essential columns)
  IF restore_data->'agents' IS NOT NULL THEN
    FOR agent_record IN SELECT * FROM json_array_elements(restore_data->'agents')
    LOOP
      INSERT INTO public.ah_agents (
        id, user_id, name, description, objective, personality, 
        system_prompt, status, welcome_message
      )
      VALUES (
        (agent_record->>'id')::uuid,
        current_user_id,
        agent_record->>'name',
        agent_record->>'description',
        agent_record->>'objective',
        agent_record->>'personality',
        agent_record->>'system_prompt',
        'draft',
        agent_record->>'welcome_message'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        personality = EXCLUDED.personality,
        system_prompt = EXCLUDED.system_prompt;
      
      agents_count := agents_count + 1;
    END LOOP;
  END IF;

  -- Restore settings
  IF restore_data->'settings' IS NOT NULL AND restore_data->>'settings' != 'null' THEN
    INSERT INTO public.user_settings (
      user_id, email_welcome, email_new_message, email_low_credits,
      email_marketing, email_weekly_report, low_credits_threshold
    )
    VALUES (
      current_user_id,
      COALESCE((restore_data->'settings'->>'email_welcome')::boolean, true),
      COALESCE((restore_data->'settings'->>'email_new_message')::boolean, true),
      COALESCE((restore_data->'settings'->>'email_low_credits')::boolean, true),
      COALESCE((restore_data->'settings'->>'email_marketing')::boolean, false),
      COALESCE((restore_data->'settings'->>'email_weekly_report')::boolean, false),
      COALESCE((restore_data->'settings'->>'low_credits_threshold')::int, 100)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email_welcome = EXCLUDED.email_welcome,
      email_new_message = EXCLUDED.email_new_message,
      email_low_credits = EXCLUDED.email_low_credits,
      email_marketing = EXCLUDED.email_marketing,
      email_weekly_report = EXCLUDED.email_weekly_report,
      low_credits_threshold = EXCLUDED.low_credits_threshold;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Data restored successfully',
    'restored', json_build_object(
      'agents', agents_count,
      'profile', true,
      'settings', true
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

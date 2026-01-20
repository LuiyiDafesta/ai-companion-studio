-- ============================================
-- DANGER ZONE SQL FUNCTIONS (FIXED)
-- ============================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS admin_export_all_data();
DROP FUNCTION IF EXISTS admin_purge_test_data();
DROP FUNCTION IF EXISTS admin_full_reset(uuid);
DROP FUNCTION IF EXISTS admin_import_data(json);

-- 1. EXPORT ALL DATA (Backup) - SIMPLIFIED VERSION
CREATE OR REPLACE FUNCTION admin_export_all_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Build the complete backup (without dynamic embedding tables for now)
  result := json_build_object(
    'backup_version', '1.0',
    'backup_date', now(),
    'tables', json_build_object(
      'ah_agents', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_agents t),
      'ah_conversations', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_conversations t),
      'ah_credits', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_credits t),
      'ah_documents', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_documents t),
      'ah_messages', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_messages t),
      'ah_profiles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_profiles t),
      'ah_public_conversations', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_public_conversations t),
      'ah_public_messages', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_public_messages t),
      'ah_subscriptions', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_subscriptions t),
      'ah_usage_logs', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.ah_usage_logs t),
      'api_tokens', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.api_tokens t),
      'credit_transactions', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.credit_transactions t),
      'credits', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.credits t),
      'n8n_chat_histories', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.n8n_chat_histories t),
      'user_roles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.user_roles t),
      'user_settings', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.user_settings t)
    )
  );

  RETURN result;
END;
$$;

-- 2. PURGE TEST DATA (keeps users, agents, documents, settings)
CREATE OR REPLACE FUNCTION admin_purge_test_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_count int;
  msg_count int;
  pub_conv_count int;
  pub_msg_count int;
  usage_count int;
  n8n_count int;
BEGIN
  -- Count before delete
  SELECT count(*) INTO conv_count FROM public.ah_conversations;
  SELECT count(*) INTO msg_count FROM public.ah_messages;
  SELECT count(*) INTO pub_conv_count FROM public.ah_public_conversations;
  SELECT count(*) INTO pub_msg_count FROM public.ah_public_messages;
  SELECT count(*) INTO usage_count FROM public.ah_usage_logs;
  SELECT count(*) INTO n8n_count FROM public.n8n_chat_histories;

  -- Delete test data (order matters for foreign keys)
  DELETE FROM public.ah_messages;
  DELETE FROM public.ah_conversations;
  DELETE FROM public.ah_public_messages;
  DELETE FROM public.ah_public_conversations;
  DELETE FROM public.ah_usage_logs;
  DELETE FROM public.n8n_chat_histories;

  -- Return counts
  RETURN json_build_object(
    'ah_conversations', conv_count,
    'ah_messages', msg_count,
    'ah_public_conversations', pub_conv_count,
    'ah_public_messages', pub_msg_count,
    'ah_usage_logs', usage_count,
    'n8n_chat_histories', n8n_count
  );
END;
$$;

-- 3. FULL SYSTEM RESET (deletes everything except specified admin)
CREATE OR REPLACE FUNCTION admin_full_reset(keep_admin_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  embedding_tables text[];
  tbl text;
BEGIN
  -- Delete in order (respecting foreign keys)
  
  -- 1. Messages first
  DELETE FROM public.ah_messages;
  DELETE FROM public.ah_public_messages;
  DELETE FROM public.n8n_chat_histories;
  
  -- 2. Conversations
  DELETE FROM public.ah_conversations;
  DELETE FROM public.ah_public_conversations;
  
  -- 3. Usage logs and transactions
  DELETE FROM public.ah_usage_logs;
  DELETE FROM public.credit_transactions;
  
  -- 4. Documents (before agents)
  DELETE FROM public.ah_documents;
  
  -- 5. Drop all embedding tables
  SELECT array_agg(tablename) INTO embedding_tables
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'embeddings_%';
  
  IF embedding_tables IS NOT NULL THEN
    FOR tbl IN SELECT unnest(embedding_tables) LOOP
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', tbl);
    END LOOP;
  END IF;
  
  -- 6. Agents
  DELETE FROM public.ah_agents;
  
  -- 7. API tokens
  DELETE FROM public.api_tokens;
  
  -- 8. Credits and subscriptions
  DELETE FROM public.ah_credits;
  DELETE FROM public.credits;
  DELETE FROM public.ah_subscriptions;
  
  -- 9. User settings
  DELETE FROM public.user_settings;
  
  -- 10. User roles (except admin if specified)
  IF keep_admin_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id != keep_admin_id;
  ELSE
    DELETE FROM public.user_roles;
  END IF;
  
  -- 11. Profiles (except admin if specified)
  IF keep_admin_id IS NOT NULL THEN
    DELETE FROM public.ah_profiles WHERE user_id != keep_admin_id;
  ELSE
    DELETE FROM public.ah_profiles;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'System reset complete',
    'kept_admin_id', keep_admin_id
  );
END;
$$;

-- 4. RESTORE ALL DATA (Admin restore from backup)
CREATE OR REPLACE FUNCTION admin_restore_all_data(backup_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tables_data json;
  rec json;
  profiles_count int := 0;
  agents_count int := 0;
  settings_count int := 0;
BEGIN
  -- Validate backup format
  IF backup_data->>'backup_version' IS NULL THEN
    RAISE EXCEPTION 'Invalid backup format: missing backup_version';
  END IF;

  tables_data := backup_data->'tables';

  -- Restore profiles
  IF tables_data->'ah_profiles' IS NOT NULL THEN
    FOR rec IN SELECT * FROM json_array_elements(tables_data->'ah_profiles')
    LOOP
      INSERT INTO public.ah_profiles (
        user_id, email, full_name, avatar_url, company_name, 
        company_website, phone
      )
      VALUES (
        (rec->>'user_id')::uuid,
        rec->>'email',
        rec->>'full_name',
        rec->>'avatar_url',
        rec->>'company_name',
        rec->>'company_website',
        rec->>'phone'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        company_name = EXCLUDED.company_name,
        company_website = EXCLUDED.company_website,
        phone = EXCLUDED.phone;
      profiles_count := profiles_count + 1;
    END LOOP;
  END IF;

  -- Restore agents (simplified - only essential columns)
  IF tables_data->'ah_agents' IS NOT NULL THEN
    FOR rec IN SELECT * FROM json_array_elements(tables_data->'ah_agents')
    LOOP
      INSERT INTO public.ah_agents (
        id, user_id, name, description, objective, personality,
        system_prompt, status, welcome_message
      )
      VALUES (
        (rec->>'id')::uuid,
        (rec->>'user_id')::uuid,
        rec->>'name',
        rec->>'description',
        rec->>'objective',
        rec->>'personality',
        rec->>'system_prompt',
        'draft',
        rec->>'welcome_message'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        personality = EXCLUDED.personality,
        system_prompt = EXCLUDED.system_prompt;
      agents_count := agents_count + 1;
    END LOOP;
  END IF;

  -- Restore user_settings
  IF tables_data->'user_settings' IS NOT NULL THEN
    FOR rec IN SELECT * FROM json_array_elements(tables_data->'user_settings')
    LOOP
      INSERT INTO public.user_settings (
        user_id, email_welcome, email_new_message, email_low_credits,
        email_marketing, email_weekly_report, low_credits_threshold
      )
      VALUES (
        (rec->>'user_id')::uuid,
        COALESCE((rec->>'email_welcome')::boolean, true),
        COALESCE((rec->>'email_new_message')::boolean, true),
        COALESCE((rec->>'email_low_credits')::boolean, true),
        COALESCE((rec->>'email_marketing')::boolean, false),
        COALESCE((rec->>'email_weekly_report')::boolean, false),
        COALESCE((rec->>'low_credits_threshold')::int, 100)
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email_welcome = EXCLUDED.email_welcome,
        email_new_message = EXCLUDED.email_new_message,
        email_low_credits = EXCLUDED.email_low_credits;
      settings_count := settings_count + 1;
    END LOOP;
  END IF;

  -- Restore user_roles
  IF tables_data->'user_roles' IS NOT NULL THEN
    FOR rec IN SELECT * FROM json_array_elements(tables_data->'user_roles')
    LOOP
      INSERT INTO public.user_roles (user_id, role)
      VALUES (
        (rec->>'user_id')::uuid,
        rec->>'role'
      )
      ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Restore credits
  IF tables_data->'ah_credits' IS NOT NULL THEN
    FOR rec IN SELECT * FROM json_array_elements(tables_data->'ah_credits')
    LOOP
      INSERT INTO public.ah_credits (user_id, balance)
      VALUES (
        (rec->>'user_id')::uuid,
        COALESCE((rec->>'balance')::int, 0)
      )
      ON CONFLICT (user_id) DO UPDATE SET
        balance = EXCLUDED.balance;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Data restored successfully',
    'restored', json_build_object(
      'profiles', profiles_count,
      'agents', agents_count,
      'settings', settings_count
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

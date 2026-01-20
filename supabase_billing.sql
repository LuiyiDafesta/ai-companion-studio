-- ============================================
-- BILLING SYSTEM SQL FUNCTIONS (FIXED)
-- ============================================

-- Ensure required columns exist
ALTER TABLE ah_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE ah_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP;

-- Add Foreign Keys to ah_profiles to enable joins in Admin Dashboard
DO $$
BEGIN
  -- ah_subscriptions -> ah_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ah_subscriptions_user_id_fkey') THEN
    ALTER TABLE ah_subscriptions
    ADD CONSTRAINT ah_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES ah_profiles(id) ON DELETE CASCADE;
  END IF;

  -- ah_credits -> ah_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ah_credits_user_id_fkey') THEN
    ALTER TABLE ah_credits
    ADD CONSTRAINT ah_credits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES ah_profiles(id) ON DELETE CASCADE;
  END IF;

  -- credit_transactions -> ah_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_transactions_user_id_fkey') THEN
    ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES ah_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Plan configuration (using enum values: free, pro, business)
CREATE OR REPLACE FUNCTION get_plan_config(plan_name text)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  CASE plan_name
    WHEN 'free' THEN
      RETURN json_build_object(
        'name', 'Starter',
        'price', 0,
        'credits', 50,
        'max_agents', 1,
        'rag_full', false,
        'support', 'none',
        'api_access', false,
        'can_buy_extras', false
      );
    WHEN 'pro' THEN
      RETURN json_build_object(
        'name', 'Professional',
        'price', 25,
        'credits', 500,
        'max_agents', 3,
        'rag_full', true,
        'support', 'email',
        'api_access', false,
        'can_buy_extras', true
      );
    WHEN 'business' THEN
      RETURN json_build_object(
        'name', 'Business',
        'price', 75,
        'credits', 2000,
        'max_agents', 5,
        'rag_full', true,
        'support', 'priority',
        'api_access', true,
        'can_buy_extras', true
      );
    ELSE
      RETURN json_build_object('error', 'Unknown plan');
  END CASE;
END;
$$;

-- Change subscription plan (using plan_type column)
CREATE OR REPLACE FUNCTION change_subscription_plan(new_plan text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_sub record;
  new_config json;
  old_config json;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get plan configs
  new_config := get_plan_config(new_plan);
  IF new_config->>'error' IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid plan: %', new_plan;
  END IF;

  -- Get current subscription
  SELECT * INTO current_sub FROM ah_subscriptions WHERE user_id = current_user_id;

  IF current_sub IS NULL THEN
    -- Create new subscription
    INSERT INTO ah_subscriptions (user_id, plan_type, status, current_period_start, current_period_end)
    VALUES (
      current_user_id,
      new_plan::subscription_plan,
      'active',
      now(),
      now() + interval '30 days'
    );
  ELSE
    -- Update existing subscription
    old_config := get_plan_config(current_sub.plan_type::text);
    
    UPDATE ah_subscriptions
    SET 
      plan_type = new_plan::subscription_plan,
      status = 'active',
      current_period_start = CASE WHEN new_plan != current_sub.plan_type::text THEN now() ELSE current_period_start END,
      current_period_end = CASE WHEN new_plan != current_sub.plan_type::text THEN now() + interval '30 days' ELSE current_period_end END,
      cancel_at_period_end = false,
      updated_at = now()
    WHERE user_id = current_user_id;
  END IF;

  -- Update credits based on plan
  IF current_sub IS NULL OR (new_config->>'credits')::int < COALESCE((old_config->>'credits')::int, 0) THEN
    -- New or downgrade: set to plan credits
    UPDATE ah_credits SET balance = (new_config->>'credits')::int WHERE user_id = current_user_id;
    IF NOT FOUND THEN
      INSERT INTO ah_credits (user_id, balance) VALUES (current_user_id, (new_config->>'credits')::int);
    END IF;
  ELSE
    -- Upgrade: add difference
    UPDATE ah_credits 
    SET balance = balance + ((new_config->>'credits')::int - COALESCE((old_config->>'credits')::int, 0))
    WHERE user_id = current_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'plan', new_plan,
    'credits', (new_config->>'credits')::int,
    'period_end', (now() + interval '30 days')::date
  );
END;
$$;

-- Cancel subscription (marks for cancellation at period end)
CREATE OR REPLACE FUNCTION cancel_subscription()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  sub record;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO sub FROM ah_subscriptions WHERE user_id = current_user_id;
  
  IF sub IS NULL OR sub.plan_type = 'free' THEN
    RETURN json_build_object('success', false, 'message', 'No active paid subscription');
  END IF;

  UPDATE ah_subscriptions
  SET 
    cancel_at_period_end = true,
    updated_at = now()
  WHERE user_id = current_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Subscription will be cancelled at period end',
    'cancels_at', sub.current_period_end
  );
END;
$$;

-- Purchase extra credits
CREATE OR REPLACE FUNCTION purchase_extra_credits(package text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  sub record;
  credits_to_add int;
  price numeric;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate package
  CASE package
    WHEN '500' THEN credits_to_add := 500; price := 15;
    WHEN '2000' THEN credits_to_add := 2000; price := 50;
    WHEN '5000' THEN credits_to_add := 5000; price := 100;
    ELSE RAISE EXCEPTION 'Invalid credit package';
  END CASE;

  -- Check if user can buy extras (pro or business)
  SELECT * INTO sub FROM ah_subscriptions WHERE user_id = current_user_id;
  
  IF sub IS NULL OR sub.plan_type = 'free' THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'Debes tener un plan Professional o Business para comprar créditos extra'
    );
  END IF;

  -- Add credits
  UPDATE ah_credits 
  SET balance = balance + credits_to_add 
  WHERE user_id = current_user_id;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (current_user_id, credits_to_add, 'purchase', 'Credit package: ' || package);

  RETURN json_build_object(
    'success', true,
    'credits_added', credits_to_add,
    'price', price
  );
END;
$$;

-- Get user subscription details
CREATE OR REPLACE FUNCTION get_my_subscription()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  sub record;
  creds record;
  agent_count int;
  plan_config json;
  plan_name text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO sub FROM ah_subscriptions WHERE user_id = current_user_id;
  SELECT * INTO creds FROM ah_credits WHERE user_id = current_user_id;
  SELECT count(*) INTO agent_count FROM ah_agents WHERE user_id = current_user_id;
  
  plan_name := COALESCE(sub.plan_type::text, 'free');
  plan_config := get_plan_config(plan_name);

  RETURN json_build_object(
    'plan', plan_name,
    'plan_config', plan_config,
    'status', COALESCE(sub.status, 'active'),
    'current_period_end', sub.current_period_end,
    'cancel_at_period_end', COALESCE(sub.cancel_at_period_end, false),
    'credits_balance', COALESCE(creds.balance, 50),
    'agent_count', agent_count,
    'max_agents', (plan_config->>'max_agents')::int
  );
END;
$$;

-- Check if user can create more agents
CREATE OR REPLACE FUNCTION can_create_agent()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  sub record;
  agent_count int;
  max_agents int;
  plan_config json;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO sub FROM ah_subscriptions WHERE user_id = current_user_id;
  SELECT count(*) INTO agent_count FROM ah_agents WHERE user_id = current_user_id;
  
  plan_config := get_plan_config(COALESCE(sub.plan_type::text, 'free'));
  max_agents := (plan_config->>'max_agents')::int;

  RETURN json_build_object(
    'can_create', agent_count < max_agents,
    'current_count', agent_count,
    'max_allowed', max_agents,
    'plan', COALESCE(sub.plan_type::text, 'free')
  );
END;
$$;

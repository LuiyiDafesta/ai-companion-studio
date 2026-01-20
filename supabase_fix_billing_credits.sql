-- ============================================
-- FIX: Créditos de suscripción + Historial
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. CORREGIR FUNCIÓN change_subscription_plan
DROP FUNCTION IF EXISTS change_subscription_plan(text);

CREATE OR REPLACE FUNCTION change_subscription_plan(new_plan text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_sub record;
  current_credits int;
  new_config json;
  old_config json;
  plan_credits int;
  old_plan_credits int;
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

  plan_credits := (new_config->>'credits')::int;

  -- Get current subscription and credits
  SELECT * INTO current_sub FROM ah_subscriptions WHERE user_id = current_user_id;
  SELECT balance INTO current_credits FROM ah_credits WHERE user_id = current_user_id;

  -- Default current credits to 0 if not found
  current_credits := COALESCE(current_credits, 0);

  IF current_sub IS NULL THEN
    -- NEW USER: Create subscription and ADD plan credits to existing balance
    INSERT INTO ah_subscriptions (user_id, plan_type, status, current_period_start, current_period_end)
    VALUES (
      current_user_id,
      new_plan::subscription_plan,
      'active',
      now(),
      now() + interval '30 days'
    );
    
    -- Add credits (not replace)
    UPDATE ah_credits SET balance = balance + plan_credits WHERE user_id = current_user_id;
    IF NOT FOUND THEN
      INSERT INTO ah_credits (user_id, balance) VALUES (current_user_id, plan_credits);
    END IF;
    
    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (current_user_id, plan_credits, 'bonus', 'Suscripción: ' || new_plan);
    
  ELSE
    -- EXISTING USER
    old_config := get_plan_config(current_sub.plan_type::text);
    old_plan_credits := COALESCE((old_config->>'credits')::int, 0);
    
    -- Update subscription
    UPDATE ah_subscriptions
    SET 
      plan_type = new_plan::subscription_plan,
      status = 'active',
      current_period_start = CASE WHEN new_plan != current_sub.plan_type::text THEN now() ELSE current_period_start END,
      current_period_end = CASE WHEN new_plan != current_sub.plan_type::text THEN now() + interval '30 days' ELSE current_period_end END,
      cancel_at_period_end = false,
      updated_at = now()
    WHERE user_id = current_user_id;
    
    IF new_plan = current_sub.plan_type::text THEN
      -- Same plan (renewal): ADD full plan credits
      UPDATE ah_credits SET balance = balance + plan_credits WHERE user_id = current_user_id;
      
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (current_user_id, plan_credits, 'bonus', 'Renovación: ' || new_plan);
      
    ELSIF plan_credits >= old_plan_credits THEN
      -- UPGRADE: Add FULL plan credits (user paid for this plan)
      UPDATE ah_credits SET balance = balance + plan_credits WHERE user_id = current_user_id;
      
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (current_user_id, plan_credits, 'bonus', 'Upgrade a: ' || new_plan);
      
    ELSE
      -- DOWNGRADE: Set to new plan credits (lose extras)
      UPDATE ah_credits SET balance = plan_credits WHERE user_id = current_user_id;
      
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (current_user_id, plan_credits - current_credits, 'usage', 'Downgrade a: ' || new_plan);
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'plan', new_plan,
    'credits', plan_credits,
    'period_end', (now() + interval '30 days')::date
  );
END;
$$;

-- 2. FUNCIÓN PARA OBTENER HISTORIAL DE CRÉDITOS
CREATE OR REPLACE FUNCTION get_credit_history(p_limit int DEFAULT 50)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  result json;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(t) INTO result FROM (
    -- Combine credit_transactions and ah_usage_logs
    SELECT 
      created_at,
      type,
      description,
      amount,
      'credit' as source
    FROM credit_transactions 
    WHERE user_id = current_user_id
    
    UNION ALL
    
    SELECT 
      created_at,
      'usage' as type,
      COALESCE(description, 'Consumo de créditos') as description,
      -amount as amount,  -- Negative for usage
      'usage' as source
    FROM ah_usage_logs
    WHERE user_id = current_user_id
    
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 3. PERMISOS
GRANT EXECUTE ON FUNCTION change_subscription_plan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_history(int) TO authenticated;

SELECT 'Fix aplicado correctamente' as resultado;

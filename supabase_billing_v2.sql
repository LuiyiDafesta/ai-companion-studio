-- ============================================
-- SISTEMA DE FACTURACIÓN COMPLETO v2
-- Ejecutar en Supabase SQL Editor
-- Preparado para PayPal
-- ============================================

-- 1. AGREGAR COLUMNA pending_plan PARA DOWNGRADES
ALTER TABLE ah_subscriptions ADD COLUMN IF NOT EXISTS pending_plan subscription_plan DEFAULT NULL;

-- 2. TABLA DE MÉTODOS DE PAGO (preparada para PayPal)
CREATE TABLE IF NOT EXISTS ah_payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider text NOT NULL DEFAULT 'card', -- 'card', 'paypal'
    is_default boolean DEFAULT true,
    -- Card fields
    card_last_four text,
    card_brand text,
    card_exp_month int,
    card_exp_year int,
    -- PayPal fields (for future)
    paypal_email text,
    paypal_payer_id text,
    -- Common fields
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, provider)
);

-- RLS for payment methods
ALTER TABLE ah_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment methods" ON ah_payment_methods;
CREATE POLICY "Users can view own payment methods" ON ah_payment_methods
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payment methods" ON ah_payment_methods;
CREATE POLICY "Users can insert own payment methods" ON ah_payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payment methods" ON ah_payment_methods;
CREATE POLICY "Users can update own payment methods" ON ah_payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own payment methods" ON ah_payment_methods;
CREATE POLICY "Users can delete own payment methods" ON ah_payment_methods
    FOR DELETE USING (auth.uid() = user_id);

-- 3. FUNCIÓN: Obtener configuración del plan
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

-- 4. FUNCIÓN: Cambiar plan de suscripción (CORREGIDA)
-- - UPGRADE: Aplicar inmediatamente + créditos completos
-- - DOWNGRADE: Programar para fin de ciclo (pending_plan)
-- - MISMO PLAN: Renovación, agregar créditos
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
  is_upgrade boolean;
  is_downgrade boolean;
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
  current_credits := COALESCE(current_credits, 0);

  IF current_sub IS NULL THEN
    -- ========== NUEVO USUARIO ==========
    INSERT INTO ah_subscriptions (user_id, plan_type, status, current_period_start, current_period_end)
    VALUES (
      current_user_id,
      new_plan::subscription_plan,
      'active',
      now(),
      now() + interval '30 days'
    );
    
    -- Agregar créditos del plan
    UPDATE ah_credits SET balance = balance + plan_credits WHERE user_id = current_user_id;
    IF NOT FOUND THEN
      INSERT INTO ah_credits (user_id, balance) VALUES (current_user_id, plan_credits);
    END IF;
    
    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (current_user_id, plan_credits, 'bonus', 'Suscripción inicial: ' || new_plan);
    
    RETURN json_build_object(
      'success', true,
      'plan', new_plan,
      'credits_added', plan_credits,
      'period_end', (now() + interval '30 days')::date,
      'action', 'new_subscription'
    );
    
  ELSE
    -- ========== USUARIO EXISTENTE ==========
    old_config := get_plan_config(current_sub.plan_type::text);
    old_plan_credits := COALESCE((old_config->>'credits')::int, 0);
    
    -- Determinar si es upgrade o downgrade
    is_upgrade := plan_credits > old_plan_credits;
    is_downgrade := plan_credits < old_plan_credits;
    
    IF new_plan = current_sub.plan_type::text THEN
      -- ========== MISMO PLAN (RENOVACIÓN) ==========
      -- Agregar créditos completos
      UPDATE ah_credits SET balance = balance + plan_credits WHERE user_id = current_user_id;
      
      -- Extender período
      UPDATE ah_subscriptions
      SET 
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        cancel_at_period_end = false,
        pending_plan = NULL,
        updated_at = now()
      WHERE user_id = current_user_id;
      
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (current_user_id, plan_credits, 'bonus', 'Renovación: ' || new_plan);
      
      RETURN json_build_object(
        'success', true,
        'plan', new_plan,
        'credits_added', plan_credits,
        'period_end', (now() + interval '30 days')::date,
        'action', 'renewal'
      );
      
    ELSIF is_upgrade THEN
      -- ========== UPGRADE ==========
      -- Aplicar inmediatamente + créditos completos del nuevo plan
      UPDATE ah_subscriptions
      SET 
        plan_type = new_plan::subscription_plan,
        status = 'active',
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        cancel_at_period_end = false,
        pending_plan = NULL,
        updated_at = now()
      WHERE user_id = current_user_id;
      
      -- Agregar créditos COMPLETOS del nuevo plan (no diferencia)
      UPDATE ah_credits SET balance = balance + plan_credits WHERE user_id = current_user_id;
      
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (current_user_id, plan_credits, 'bonus', 'Upgrade a: ' || new_plan);
      
      RETURN json_build_object(
        'success', true,
        'plan', new_plan,
        'credits_added', plan_credits,
        'period_end', (now() + interval '30 days')::date,
        'action', 'upgrade'
      );
      
    ELSE
      -- ========== DOWNGRADE ==========
      -- NO cambiar plan inmediatamente, programar para fin de ciclo
      UPDATE ah_subscriptions
      SET 
        pending_plan = new_plan::subscription_plan,
        updated_at = now()
      WHERE user_id = current_user_id;
      
      RETURN json_build_object(
        'success', true,
        'current_plan', current_sub.plan_type::text,
        'pending_plan', new_plan,
        'effective_date', current_sub.current_period_end::date,
        'action', 'downgrade_scheduled',
        'message', 'Tu plan cambiará a ' || new_plan || ' el ' || current_sub.current_period_end::date
      );
    END IF;
  END IF;
END;
$$;

-- 5. FUNCIÓN: Cancelar suscripción (mantener hasta fin de ciclo)
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
    RETURN json_build_object('success', false, 'message', 'No tienes una suscripción de pago activa');
  END IF;

  -- Marcar para cancelar al final del período (NO cambiar ahora)
  UPDATE ah_subscriptions
  SET 
    cancel_at_period_end = true,
    pending_plan = NULL, -- Cancelar cualquier downgrade pendiente
    updated_at = now()
  WHERE user_id = current_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Suscripción cancelada. Tu plan se mantendrá activo hasta el final del período.',
    'cancels_at', sub.current_period_end,
    'current_plan', sub.plan_type::text
  );
END;
$$;

-- 6. FUNCIÓN: Procesar ciclo de suscripción (para cron job o webhook)
-- Ejecutar cuando termina el período
CREATE OR REPLACE FUNCTION process_subscription_cycle(p_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub record;
  pm record;
  new_plan text;
  plan_config json;
  processed int := 0;
BEGIN
  -- Procesar todas las suscripciones vencidas, o una específica
  FOR sub IN 
    SELECT * FROM ah_subscriptions 
    WHERE current_period_end <= now()
    AND (p_user_id IS NULL OR user_id = p_user_id)
  LOOP
    -- Verificar si hay método de pago
    SELECT * INTO pm FROM ah_payment_methods WHERE user_id = sub.user_id AND is_default = true LIMIT 1;
    
    IF sub.cancel_at_period_end THEN
      -- ========== CANCELACIÓN: Cambiar a FREE ==========
      UPDATE ah_subscriptions
      SET 
        plan_type = 'free',
        status = 'active',
        current_period_start = now(),
        current_period_end = NULL,
        cancel_at_period_end = false,
        pending_plan = NULL,
        updated_at = now()
      WHERE user_id = sub.user_id;
      
      -- Establecer créditos a 50 (plan free)
      UPDATE ah_credits SET balance = 50 WHERE user_id = sub.user_id;
      
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (sub.user_id, 50, 'bonus', 'Cambio a plan Free por cancelación');
      
    ELSIF sub.pending_plan IS NOT NULL THEN
      -- ========== DOWNGRADE PROGRAMADO ==========
      new_plan := sub.pending_plan::text;
      plan_config := get_plan_config(new_plan);
      
      IF pm IS NOT NULL THEN
        -- Tiene método de pago: aplicar nuevo plan
        UPDATE ah_subscriptions
        SET 
          plan_type = sub.pending_plan,
          status = 'active',
          current_period_start = now(),
          current_period_end = now() + interval '30 days',
          pending_plan = NULL,
          updated_at = now()
        WHERE user_id = sub.user_id;
        
        -- Agregar créditos del nuevo plan
        UPDATE ah_credits SET balance = balance + (plan_config->>'credits')::int WHERE user_id = sub.user_id;
        
        INSERT INTO credit_transactions (user_id, amount, type, description)
        VALUES (sub.user_id, (plan_config->>'credits')::int, 'bonus', 'Cambio a plan: ' || new_plan);
        
        -- TODO: Cobrar con PayPal/método de pago
      ELSE
        -- Sin método de pago: cambiar a FREE
        UPDATE ah_subscriptions
        SET 
          plan_type = 'free',
          status = 'active',
          current_period_start = now(),
          current_period_end = NULL,
          pending_plan = NULL,
          updated_at = now()
        WHERE user_id = sub.user_id;
        
        UPDATE ah_credits SET balance = 50 WHERE user_id = sub.user_id;
      END IF;
      
    ELSIF pm IS NOT NULL AND sub.plan_type != 'free' THEN
      -- ========== RENOVACIÓN AUTOMÁTICA ==========
      plan_config := get_plan_config(sub.plan_type::text);
      
      -- Extender período
      UPDATE ah_subscriptions
      SET 
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        updated_at = now()
      WHERE user_id = sub.user_id;
      
      -- Agregar créditos del plan
      UPDATE ah_credits SET balance = balance + (plan_config->>'credits')::int WHERE user_id = sub.user_id;
      
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (sub.user_id, (plan_config->>'credits')::int, 'bonus', 'Renovación automática: ' || sub.plan_type::text);
      
      -- TODO: Cobrar con PayPal/método de pago
      
    ELSE
      -- Sin método de pago y plan de pago vencido: cambiar a FREE
      UPDATE ah_subscriptions
      SET 
        plan_type = 'free',
        status = 'active',
        current_period_start = now(),
        current_period_end = NULL,
        updated_at = now()
      WHERE user_id = sub.user_id;
      
      UPDATE ah_credits SET balance = 50 WHERE user_id = sub.user_id;
    END IF;
    
    processed := processed + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'processed', processed);
END;
$$;

-- 7. FUNCIÓN: Obtener mi suscripción (incluye pending_plan)
CREATE OR REPLACE FUNCTION get_my_subscription()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  sub record;
  creds record;
  pm record;
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
  SELECT * INTO pm FROM ah_payment_methods WHERE user_id = current_user_id AND is_default = true LIMIT 1;
  SELECT count(*) INTO agent_count FROM ah_agents WHERE user_id = current_user_id;
  
  plan_name := COALESCE(sub.plan_type::text, 'free');
  plan_config := get_plan_config(plan_name);

  RETURN json_build_object(
    'plan', plan_name,
    'plan_config', plan_config,
    'status', COALESCE(sub.status, 'active'),
    'current_period_end', sub.current_period_end,
    'cancel_at_period_end', COALESCE(sub.cancel_at_period_end, false),
    'pending_plan', sub.pending_plan,
    'credits_balance', COALESCE(creds.balance, 50),
    'agent_count', agent_count,
    'max_agents', (plan_config->>'max_agents')::int,
    'has_payment_method', pm IS NOT NULL
  );
END;
$$;

-- 8. FUNCIÓN: Obtener mi método de pago
CREATE OR REPLACE FUNCTION get_my_payment_method()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  pm record;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO pm FROM ah_payment_methods WHERE user_id = current_user_id AND is_default = true LIMIT 1;

  IF pm IS NULL THEN
    RETURN json_build_object('has_payment_method', false);
  END IF;

  RETURN json_build_object(
    'has_payment_method', true,
    'provider', pm.provider,
    'card_last_four', pm.card_last_four,
    'card_brand', pm.card_brand,
    'card_exp_month', pm.card_exp_month,
    'card_exp_year', pm.card_exp_year,
    'paypal_email', pm.paypal_email
  );
END;
$$;

-- 9. FUNCIÓN: Guardar método de pago
CREATE OR REPLACE FUNCTION save_payment_method(
  p_card_last_four text DEFAULT NULL,
  p_card_brand text DEFAULT NULL,
  p_card_exp_month int DEFAULT NULL,
  p_card_exp_year int DEFAULT NULL,
  p_provider text DEFAULT 'card',
  p_paypal_email text DEFAULT NULL,
  p_paypal_payer_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert payment method
  INSERT INTO ah_payment_methods (
    user_id, provider, is_default, 
    card_last_four, card_brand, card_exp_month, card_exp_year,
    paypal_email, paypal_payer_id, updated_at
  )
  VALUES (
    current_user_id, p_provider, true,
    p_card_last_four, p_card_brand, p_card_exp_month, p_card_exp_year,
    p_paypal_email, p_paypal_payer_id, now()
  )
  ON CONFLICT (user_id, provider) DO UPDATE SET
    card_last_four = EXCLUDED.card_last_four,
    card_brand = EXCLUDED.card_brand,
    card_exp_month = EXCLUDED.card_exp_month,
    card_exp_year = EXCLUDED.card_exp_year,
    paypal_email = EXCLUDED.paypal_email,
    paypal_payer_id = EXCLUDED.paypal_payer_id,
    is_default = true,
    updated_at = now();

  RETURN json_build_object('success', true, 'provider', p_provider);
END;
$$;

-- 10. FUNCIÓN: ¿Puede eliminar método de pago?
-- Solo si está en FREE o tiene cancel_at_period_end = true
CREATE OR REPLACE FUNCTION can_delete_payment_method()
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

  -- Puede eliminar si:
  -- 1. No tiene suscripción (nunca se suscribió)
  -- 2. Está en plan FREE
  -- 3. Tiene cancelación programada (cancel_at_period_end = true)
  IF sub IS NULL OR sub.plan_type = 'free' OR sub.cancel_at_period_end = true THEN
    RETURN json_build_object('can_delete', true);
  ELSE
    RETURN json_build_object(
      'can_delete', false, 
      'reason', 'Debes cancelar tu suscripción primero para eliminar el método de pago'
    );
  END IF;
END;
$$;

-- 11. FUNCIÓN: Eliminar método de pago
CREATE OR REPLACE FUNCTION delete_payment_method()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  can_delete_result json;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if can delete
  can_delete_result := can_delete_payment_method();
  IF NOT (can_delete_result->>'can_delete')::boolean THEN
    RETURN json_build_object(
      'success', false, 
      'reason', can_delete_result->>'reason'
    );
  END IF;

  DELETE FROM ah_payment_methods WHERE user_id = current_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 12. FUNCIÓN: Historial de créditos
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
    -- credit_transactions (bonuses, purchases)
    SELECT 
      created_at,
      type,
      description,
      amount,
      'credit' as source
    FROM credit_transactions 
    WHERE user_id = current_user_id
    
    UNION ALL
    
    -- ah_usage_logs (consumption)
    SELECT 
      created_at,
      'usage' as type,
      COALESCE(description, 'Consumo de créditos') as description,
      -amount as amount,
      'usage' as source
    FROM ah_usage_logs
    WHERE user_id = current_user_id
    
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 13. FUNCIONES DE ADMINISTRACIÓN (NUEVAS)
-- Para evitar problemas de RLS y obtener datos agregados

-- Admin: Get Subscriptions
CREATE OR REPLACE FUNCTION get_admin_subscriptions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_agg(t) INTO result FROM (
        SELECT 
            s.*,
            p.email as user_email
        FROM ah_subscriptions s
        JOIN ah_profiles p ON s.user_id = p.user_id
        ORDER BY s.created_at DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Admin: Get Transactions (con email)
CREATE OR REPLACE FUNCTION get_admin_transactions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_agg(t) INTO result FROM (
        SELECT 
            ct.*,
            p.email as user_email
        FROM credit_transactions ct
        JOIN ah_profiles p ON ct.user_id = p.user_id
        ORDER BY ct.created_at DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Admin: Get Credit Balances (con email)
CREATE OR REPLACE FUNCTION get_admin_credit_balances()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_agg(t) INTO result FROM (
        SELECT 
            c.*,
            p.email as user_email
        FROM ah_credits c
        JOIN ah_profiles p ON c.user_id = p.user_id
        ORDER BY c.balance DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Admin: Get Agents (con creador) - IMPORTANTE para arreglar "Unknown"
CREATE OR REPLACE FUNCTION get_admin_agents()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_agg(t) INTO result FROM (
        SELECT 
            a.*,
            p.email as user_email,
            p.full_name as user_full_name
        FROM ah_agents a
        JOIN ah_profiles p ON a.user_id = p.user_id
        ORDER BY a.created_at DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Admin: Get Users (completo) - IMPORTANTE para arreglar error de carga
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_agg(t) INTO result FROM (
        SELECT 
            p.*,
            COALESCE(ur.role, 'user') as role,
            COALESCE(c.balance, 0) as credit_balance,
            (SELECT count(*) FROM ah_agents a WHERE a.user_id = p.user_id) as agents_count
        FROM ah_profiles p
        LEFT JOIN user_roles ur ON p.user_id = ur.user_id
        LEFT JOIN ah_credits c ON p.user_id = c.user_id
        ORDER BY p.created_at DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 14. FUNCIÓN: Purchase Extra Credits (CORREGIDA CON NUEVOS PRECIOS)
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
    WHEN '500' THEN credits_to_add := 500; price := 25;
    WHEN '2000' THEN credits_to_add := 2000; price := 60;
    WHEN '5000' THEN credits_to_add := 5000; price := 130;
    ELSE RAISE EXCEPTION 'Invalid credit package';
  END CASE;

  -- Check if user can buy extras (pro or business)
  SELECT * INTO sub FROM ah_subscriptions WHERE user_id = current_user_id;
  
  -- Solo permitir si NO es free
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
  VALUES (current_user_id, credits_to_add, 'purchase', 'Credit purchase: ' || package);

  RETURN json_build_object(
    'success', true,
    'credits_added', credits_to_add,
    'price', price
  );
END;
$$;

-- 15. PERMISOS
GRANT EXECUTE ON FUNCTION get_plan_config(text) TO authenticated;
GRANT EXECUTE ON FUNCTION change_subscription_plan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION process_subscription_cycle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_payment_method() TO authenticated;
GRANT EXECUTE ON FUNCTION save_payment_method(text, text, int, int, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_payment_method() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_payment_method() TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_history(int) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_extra_credits(text) TO authenticated;

-- Admin permissions
GRANT EXECUTE ON FUNCTION get_admin_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_credit_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_agents() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;

-- Resultado
SELECT 'Sistema de facturación v2 y Admin RPCs instalado correctamente' as resultado;

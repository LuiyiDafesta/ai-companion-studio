-- ============================================
-- SISTEMA DE PAGOS Y SUSCRIPCIONES
-- Ejecutar COMPLETO en Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTE 1: TABLA DE MÉTODOS DE PAGO
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  card_last_four text NOT NULL,
  card_brand text NOT NULL,  -- 'visa', 'mastercard', 'amex'
  card_exp_month int NOT NULL,
  card_exp_year int NOT NULL,
  -- Preparado para integración real futura
  provider text DEFAULT 'test',  -- 'test', 'stripe', 'paypal'
  provider_customer_id text,     -- ID del cliente en Stripe/PayPal
  provider_payment_method_id text,  -- ID del método de pago
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS para payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment method" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment method" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment method" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment method" ON payment_methods;

CREATE POLICY "Users can view own payment method" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment method" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment method" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment method" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 2: MODIFICAR TABLA DE SUSCRIPCIONES
-- ============================================

ALTER TABLE ah_subscriptions 
  ADD COLUMN IF NOT EXISTS pending_plan text,  -- Plan programado para próximo ciclo
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';  -- active, pending_downgrade, canceled

-- ============================================
-- PARTE 3: FUNCIÓN PARA GUARDAR TARJETA
-- ============================================

CREATE OR REPLACE FUNCTION save_payment_method(
  p_card_last_four text,
  p_card_brand text,
  p_card_exp_month int,
  p_card_exp_year int
)
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

  -- Insertar o actualizar
  INSERT INTO payment_methods (user_id, card_last_four, card_brand, card_exp_month, card_exp_year)
  VALUES (current_user_id, p_card_last_four, p_card_brand, p_card_exp_month, p_card_exp_year)
  ON CONFLICT (user_id) DO UPDATE SET
    card_last_four = EXCLUDED.card_last_four,
    card_brand = EXCLUDED.card_brand,
    card_exp_month = EXCLUDED.card_exp_month,
    card_exp_year = EXCLUDED.card_exp_year,
    updated_at = now()
  RETURNING row_to_json(payment_methods.*) INTO result;

  RETURN json_build_object('success', true, 'payment_method', result);
END;
$$;

-- ============================================
-- PARTE 4: FUNCIÓN PARA OBTENER TARJETA
-- ============================================

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

  SELECT * INTO pm FROM payment_methods WHERE user_id = current_user_id;

  IF pm IS NULL THEN
    RETURN json_build_object('has_payment_method', false);
  END IF;

  RETURN json_build_object(
    'has_payment_method', true,
    'card_last_four', pm.card_last_four,
    'card_brand', pm.card_brand,
    'card_exp_month', pm.card_exp_month,
    'card_exp_year', pm.card_exp_year
  );
END;
$$;

-- ============================================
-- PARTE 5: FUNCIÓN PARA VERIFICAR SI PUEDE BORRAR
-- ============================================

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

  -- Si no tiene suscripción o es Free, puede borrar
  IF sub IS NULL OR sub.plan_type = 'free' THEN
    RETURN json_build_object('can_delete', true);
  END IF;

  -- Si tiene plan pago activo, NO puede borrar
  RETURN json_build_object(
    'can_delete', false,
    'reason', 'No puedes eliminar tu tarjeta mientras tengas un plan activo. Cancela tu suscripción primero.'
  );
END;
$$;

-- ============================================
-- PARTE 6: FUNCIÓN PARA BORRAR TARJETA
-- ============================================

CREATE OR REPLACE FUNCTION delete_payment_method()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  can_delete json;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar si puede borrar
  can_delete := can_delete_payment_method();
  IF NOT (can_delete->>'can_delete')::boolean THEN
    RETURN can_delete;
  END IF;

  DELETE FROM payment_methods WHERE user_id = current_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================
-- PARTE 7: FUNCIÓN MEJORADA DE CAMBIO DE PLAN
-- ============================================

DROP FUNCTION IF EXISTS change_subscription_plan(text);

CREATE OR REPLACE FUNCTION change_subscription_plan(new_plan text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_sub record;
  pm record;
  new_config json;
  old_config json;
  plan_credits int;
  old_plan_credits int;
  is_upgrade boolean;
  is_downgrade_to_free boolean;
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

  -- Get current subscription
  SELECT * INTO current_sub FROM ah_subscriptions WHERE user_id = current_user_id;
  
  -- Get payment method
  SELECT * INTO pm FROM payment_methods WHERE user_id = current_user_id;
  
  old_config := get_plan_config(COALESCE(current_sub.plan_type::text, 'free'));
  old_plan_credits := COALESCE((old_config->>'credits')::int, 50);

  -- Determine type of change
  is_upgrade := plan_credits > old_plan_credits;
  is_downgrade_to_free := new_plan = 'free';

  -- ============================================
  -- CASO 1: UPGRADE (Aplica inmediato)
  -- ============================================
  IF is_upgrade THEN
    -- Necesita tarjeta para upgrade a plan pago
    IF new_plan != 'free' AND pm IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'requires_payment', true,
        'message', 'Necesitas agregar una tarjeta para contratar este plan'
      );
    END IF;

    -- Crear o actualizar suscripción
    IF current_sub IS NULL THEN
      INSERT INTO ah_subscriptions (user_id, plan_type, status, current_period_start, current_period_end)
      VALUES (current_user_id, new_plan::subscription_plan, 'active', now(), now() + interval '30 days');
    ELSE
      UPDATE ah_subscriptions SET
        plan_type = new_plan::subscription_plan,
        status = 'active',
        pending_plan = NULL,
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        cancel_at_period_end = false,
        updated_at = now()
      WHERE user_id = current_user_id;
    END IF;

    -- Agregar créditos completos del nuevo plan
    UPDATE ah_credits SET balance = balance + plan_credits WHERE user_id = current_user_id;
    IF NOT FOUND THEN
      INSERT INTO ah_credits (user_id, balance) VALUES (current_user_id, plan_credits);
    END IF;

    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (current_user_id, plan_credits, 'purchase', 'Upgrade a: ' || new_plan);

    RETURN json_build_object(
      'success', true,
      'plan', new_plan,
      'credits_added', plan_credits,
      'period_end', (now() + interval '30 days')::date,
      'message', 'Plan actualizado correctamente'
    );

  -- ============================================
  -- CASO 2: DOWNGRADE A FREE (Aplica al renovar)
  -- ============================================
  ELSIF is_downgrade_to_free THEN
    IF current_sub IS NULL OR current_sub.plan_type = 'free' THEN
      RETURN json_build_object('success', true, 'message', 'Ya tienes plan Free');
    END IF;

    -- Marcar para cancelar al final del período
    UPDATE ah_subscriptions SET
      pending_plan = 'free',
      status = 'canceled',
      cancel_at_period_end = true,
      updated_at = now()
    WHERE user_id = current_user_id;

    RETURN json_build_object(
      'success', true,
      'plan', current_sub.plan_type,
      'pending_plan', 'free',
      'period_end', current_sub.current_period_end,
      'message', 'Tu plan actual se mantendrá hasta ' || current_sub.current_period_end::date
    );

  -- ============================================
  -- CASO 3: DOWNGRADE ENTRE PAGOS (Aplica al renovar)
  -- ============================================
  ELSE
    IF pm IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message', 'No tienes una tarjeta registrada'
      );
    END IF;

    -- Programar cambio para próximo ciclo
    UPDATE ah_subscriptions SET
      pending_plan = new_plan,
      status = 'pending_downgrade',
      updated_at = now()
    WHERE user_id = current_user_id;

    RETURN json_build_object(
      'success', true,
      'plan', current_sub.plan_type,
      'pending_plan', new_plan,
      'period_end', current_sub.current_period_end,
      'message', 'Tu plan cambiará a ' || new_plan || ' el ' || current_sub.current_period_end::date
    );
  END IF;
END;
$$;

-- ============================================
-- PARTE 8: FUNCIÓN PARA PROCESAR RENOVACIONES
-- (Llamar desde Edge Function con cron)
-- ============================================

CREATE OR REPLACE FUNCTION process_subscription_renewals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub record;
  pm record;
  new_plan text;
  plan_config json;
  processed_count int := 0;
BEGIN
  -- Buscar suscripciones expiradas
  FOR sub IN 
    SELECT s.*, p.id as has_payment_method
    FROM ah_subscriptions s
    LEFT JOIN payment_methods p ON s.user_id = p.user_id
    WHERE s.current_period_end < now()
  LOOP
    processed_count := processed_count + 1;

    -- Determinar nuevo plan
    new_plan := COALESCE(sub.pending_plan, sub.plan_type::text);

    -- Si es cancelación a Free
    IF new_plan = 'free' OR sub.status = 'canceled' THEN
      -- Actualizar a Free
      UPDATE ah_subscriptions SET
        plan_type = 'free',
        status = 'active',
        pending_plan = NULL,
        cancel_at_period_end = false,
        updated_at = now()
      WHERE user_id = sub.user_id;

      -- Resetear créditos a 50
      UPDATE ah_credits SET balance = 50 WHERE user_id = sub.user_id;

      -- Borrar tarjeta
      DELETE FROM payment_methods WHERE user_id = sub.user_id;

      -- Log
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (sub.user_id, 50 - COALESCE((SELECT balance FROM ah_credits WHERE user_id = sub.user_id), 0), 'usage', 'Fin de suscripción - Plan Free');

    -- Si tiene tarjeta, renovar
    ELSIF sub.has_payment_method IS NOT NULL THEN
      plan_config := get_plan_config(new_plan);

      -- Renovar suscripción
      UPDATE ah_subscriptions SET
        plan_type = new_plan::subscription_plan,
        status = 'active',
        pending_plan = NULL,
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        updated_at = now()
      WHERE user_id = sub.user_id;

      -- Resetear créditos al plan nuevo
      UPDATE ah_credits SET balance = (plan_config->>'credits')::int WHERE user_id = sub.user_id;

      -- Log
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (sub.user_id, (plan_config->>'credits')::int, 'purchase', 'Renovación: ' || new_plan);

    -- Sin tarjeta y no es Free = problema
    ELSE
      -- Forzar a Free
      UPDATE ah_subscriptions SET
        plan_type = 'free',
        status = 'active',
        pending_plan = NULL,
        updated_at = now()
      WHERE user_id = sub.user_id;

      UPDATE ah_credits SET balance = 50 WHERE user_id = sub.user_id;
    END IF;
  END LOOP;

  RETURN json_build_object('processed', processed_count);
END;
$$;

-- ============================================
-- PARTE 9: ACTUALIZAR get_my_subscription
-- ============================================

DROP FUNCTION IF EXISTS get_my_subscription();

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
  SELECT * INTO pm FROM payment_methods WHERE user_id = current_user_id;
  SELECT count(*) INTO agent_count FROM ah_agents WHERE user_id = current_user_id;
  
  plan_name := COALESCE(sub.plan_type::text, 'free');
  plan_config := get_plan_config(plan_name);

  RETURN json_build_object(
    'plan', plan_name,
    'plan_config', plan_config,
    'status', COALESCE(sub.status, 'active'),
    'pending_plan', sub.pending_plan,
    'current_period_end', sub.current_period_end,
    'cancel_at_period_end', COALESCE(sub.cancel_at_period_end, false),
    'credits_balance', COALESCE(creds.balance, 50),
    'agent_count', agent_count,
    'max_agents', (plan_config->>'max_agents')::int,
    'has_payment_method', pm IS NOT NULL,
    'payment_method', CASE WHEN pm IS NOT NULL THEN json_build_object(
      'card_last_four', pm.card_last_four,
      'card_brand', pm.card_brand,
      'card_exp_month', pm.card_exp_month,
      'card_exp_year', pm.card_exp_year
    ) ELSE NULL END
  );
END;
$$;

-- ============================================
-- PARTE 10: PERMISOS
-- ============================================

GRANT EXECUTE ON FUNCTION save_payment_method(text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_payment_method() TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_payment_method() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_payment_method() TO authenticated;
GRANT EXECUTE ON FUNCTION change_subscription_plan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION process_subscription_renewals() TO service_role;
GRANT EXECUTE ON FUNCTION get_my_subscription() TO authenticated;

SELECT 'Sistema de pagos configurado correctamente' as resultado;

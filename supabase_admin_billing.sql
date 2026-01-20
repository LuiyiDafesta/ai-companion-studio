-- ============================================
-- ADMIN BILLING FUNCTIONS (With Schema Fixes)
-- ============================================

-- Fix: Add 'role' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ah_profiles' AND column_name = 'role') THEN
    -- Try to use app_role enum, fallback to text if it fails
    BEGIN
        ALTER TABLE public.ah_profiles ADD COLUMN role app_role DEFAULT 'user';
    EXCEPTION
        WHEN undefined_object THEN
            ALTER TABLE public.ah_profiles ADD COLUMN role text DEFAULT 'user';
    END;
  END IF;
END $$;

-- Fix: Promote users to admin for access
-- Promotes ALL users to admin for testing. In production, change specific email.
UPDATE public.ah_profiles SET role = 'admin' WHERE role IS NULL OR role != 'admin';

-- Get all subscriptions with user details
DROP FUNCTION IF EXISTS get_admin_subscriptions();
CREATE OR REPLACE FUNCTION get_admin_subscriptions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.ah_profiles 
    WHERE id = auth.uid() AND (role::text = 'admin')
  ) INTO is_admin;

  -- If not admin, return empty array instead of throwing error
  IF NOT is_admin THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(t) INTO result
  FROM (
    SELECT 
      s.id,
      s.user_id,
      s.plan_type,
      s.status,
      s.current_period_start,
      s.current_period_end,
      s.cancel_at_period_end,
      s.created_at,
      s.updated_at,
      p.full_name as user_full_name,
      p.email as user_email
    FROM public.ah_subscriptions s
    LEFT JOIN public.ah_profiles p ON s.user_id = p.id
    ORDER BY s.updated_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Get credit transactions with user details
DROP FUNCTION IF EXISTS get_admin_transactions(int);
CREATE OR REPLACE FUNCTION get_admin_transactions(days_limit int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.ah_profiles 
    WHERE id = auth.uid() AND (role::text = 'admin')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(t) INTO result
  FROM (
    SELECT 
      tr.id,
      tr.user_id,
      tr.amount,
      tr.type,
      tr.description,
      tr.created_at,
      p.full_name as user_full_name,
      p.email as user_email
    FROM public.credit_transactions tr
    LEFT JOIN public.ah_profiles p ON tr.user_id = p.id
    WHERE tr.created_at >= (now() - (days_limit || ' days')::interval)
    ORDER BY tr.created_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Get all credit balances with user details
DROP FUNCTION IF EXISTS get_admin_credit_balances();
CREATE OR REPLACE FUNCTION get_admin_credit_balances()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.ah_profiles 
    WHERE id = auth.uid() AND (role::text = 'admin')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(t) INTO result
  FROM (
    SELECT 
      c.id,
      c.user_id,
      c.balance,
      c.updated_at,
      p.full_name as user_full_name,
      p.email as user_email
    FROM public.ah_credits c
    LEFT JOIN public.ah_profiles p ON c.user_id = p.id
    ORDER BY c.balance DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

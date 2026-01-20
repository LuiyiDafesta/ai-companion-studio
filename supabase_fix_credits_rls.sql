-- ============================================
-- FIX: Allow users to update their own credits
-- ============================================
-- Problem: Users can SELECT their credits but cannot UPDATE them.
-- This causes the credit deduction in useConsumeCredits to fail silently.

-- Enable RLS on ah_credits (if not already enabled)
ALTER TABLE ah_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own credits" ON ah_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON ah_credits;
DROP POLICY IF EXISTS "Admins can view all credits" ON ah_credits;
DROP POLICY IF EXISTS "Admins can update all credits" ON ah_credits;

-- Policy: Users can SELECT their own credits
CREATE POLICY "Users can view own credits"
ON ah_credits
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can UPDATE their own credits (THIS IS THE FIX)
CREATE POLICY "Users can update own credits"
ON ah_credits
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can SELECT all credits
CREATE POLICY "Admins can view all credits"
ON ah_credits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy: Admins can UPDATE all credits
CREATE POLICY "Admins can update all credits"
ON ah_credits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy: Admins can INSERT credits
CREATE POLICY "Admins can insert credits"
ON ah_credits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Also ensure ah_usage_logs has proper RLS
ALTER TABLE ah_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage logs" ON ah_usage_logs;
DROP POLICY IF EXISTS "Users can insert own usage logs" ON ah_usage_logs;
DROP POLICY IF EXISTS "Admins can view all usage logs" ON ah_usage_logs;

CREATE POLICY "Users can view own usage logs"
ON ah_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
ON ah_usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage logs"
ON ah_usage_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

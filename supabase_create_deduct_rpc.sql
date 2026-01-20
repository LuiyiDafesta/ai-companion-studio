-- FUNCTION: deduct_credits
-- Description: Safely deducts credits from the calling user's balance.
-- Security: SECURITY DEFINER (Runs with privileges of the function creator), but enforces auth.uid() check.

CREATE OR REPLACE FUNCTION deduct_credits(amount_to_deduct int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance int;
  user_id_from_auth uuid;
BEGIN
  -- Get current user ID
  user_id_from_auth := auth.uid();
  
  IF user_id_from_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current balance
  SELECT balance INTO current_balance
  FROM ah_credits
  WHERE user_id = user_id_from_auth
  FOR UPDATE; -- Lock the row to prevent race conditions

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Credits record not found';
  END IF;

  IF current_balance < amount_to_deduct THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Perform update
  UPDATE ah_credits
  SET balance = current_balance - amount_to_deduct
  WHERE user_id = user_id_from_auth;

  -- Return new balance
  RETURN current_balance - amount_to_deduct;
END;
$$;

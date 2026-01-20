-- 1. Create the function that performs the deduction
CREATE OR REPLACE FUNCTION handle_new_usage_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run as superuser to bypass RLS on ah_credits update
AS $$
BEGIN
  -- Deduct the amount from the user's credit balance
  UPDATE ah_credits
  SET balance = balance - NEW.amount
  WHERE user_id = NEW.user_id;
  
  -- If row doesn't exist (rare), we might want to create it or ignore.
  -- For now, we assume ah_credits exists for the user.
  
  RETURN NEW;
END;
$$;

-- 2. Create the trigger on ah_usage_logs
DROP TRIGGER IF EXISTS on_usage_log_insert ON ah_usage_logs;

CREATE TRIGGER on_usage_log_insert
AFTER INSERT ON ah_usage_logs
FOR EACH ROW
EXECUTE FUNCTION handle_new_usage_log();

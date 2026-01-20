-- Function to get a webhook URL by its key
-- Used by useWebhookUrl hook
CREATE OR REPLACE FUNCTION get_webhook_url(webhook_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Run as superuser to bypass RLS
SET search_path = public
AS $$
DECLARE
  found_url text;
BEGIN
  -- Attempt to find the URL in the configuration table
  SELECT url INTO found_url
  FROM webhook_configurations
  WHERE key = webhook_key
  LIMIT 1;
  
  -- Return the URL (can be null if not found)
  RETURN found_url;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_webhook_url(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_url(text) TO service_role;

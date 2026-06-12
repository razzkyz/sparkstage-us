-- Create rate_limit_logs table for rate limiting tracking
-- This table tracks request attempts for rate limiting sensitive endpoints

CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE, -- Format: "prefix:identifier" e.g., "login:user@email.com"
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start BIGINT NOT NULL, -- Timestamp when the current window started
  last_request_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_key ON public.rate_limit_logs(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_updated_at ON public.rate_limit_logs(updated_at);

-- Auto-cleanup old entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_logs
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-rate-limits', '0 */6 * * *', 'SELECT cleanup_old_rate_limits()');

-- Disable RLS for this table (it's internal/system table)
ALTER TABLE public.rate_limit_logs DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE public.rate_limit_logs IS 'System table for tracking rate limiting of sensitive operations (login, checkout, etc)';

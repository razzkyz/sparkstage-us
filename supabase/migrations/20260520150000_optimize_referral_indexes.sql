-- Phase 4: Performance optimization for referral system
-- Add indexes to improve query performance for high-traffic operations

-- Index untuk referral_codes queries (creator lookup, active codes)
CREATE INDEX IF NOT EXISTS idx_referral_codes_creator_active
  ON public.referral_codes(creator_user_id, is_active, expires_at DESC);

-- Index untuk referral_codes code lookup (apply referral code)
CREATE INDEX IF NOT EXISTS idx_referral_codes_code_active
  ON public.referral_codes(code, is_active)
  WHERE is_active = true;

-- Index untuk referral_uses queries (referred user lookup, duplicate check)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_uses_referred_code
  ON public.referral_uses(referral_code_id, referred_user_id);

-- Index untuk referral_uses referrer lookup (get stats)
CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer
  ON public.referral_uses(referrer_user_id, used_at DESC);

-- Index untuk audit logs on referral actions
CREATE INDEX IF NOT EXISTS idx_audit_logs_referral
  ON public.audit_logs(table_name, action, created_at DESC)
  WHERE table_name IN ('referral_codes', 'referral_uses');

-- Analyze to update query planner statistics
ANALYZE public.referral_codes;
ANALYZE public.referral_uses;
ANALYZE public.audit_logs;

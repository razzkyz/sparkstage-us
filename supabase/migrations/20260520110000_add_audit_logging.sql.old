-- ============================================
-- Migration: Add Audit Logging Table
-- Date: 2026-05-20
-- Description: 
--   Create audit_logs table to track sensitive actions.
--   Logs admin role changes, payment refunds, voucher modifications, stock changes.
--   Does NOT modify any existing tables or functions.
--   Triggers are added separately with error handling.
-- ============================================

-- Create audit_logs table
-- Purpose: Track all sensitive admin actions for compliance & security
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'admin_role_assigned', 'payment_refunded', 'voucher_modified', 'stock_changed', etc.
  table_name VARCHAR(100) NOT NULL, -- Which table was affected
  record_id VARCHAR(255), -- ID of affected record (could be UUID, integer, etc.)
  old_values JSONB, -- Previous values (only for important fields)
  new_values JSONB, -- New values (only for important fields)
  ip_address INET, -- IP address of request (extracted from JWT claims if available)
  user_agent TEXT, -- User agent from request
  description TEXT, -- Human-readable description of what changed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Index for common queries
  CONSTRAINT audit_logs_action_check CHECK (action IN (
    'admin_role_assigned',
    'admin_role_removed',
    'payment_refunded',
    'voucher_created',
    'voucher_modified',
    'voucher_deleted',
    'stock_adjusted',
    'order_cancelled',
    'loyalty_points_redeemed',
    'customer_data_exported'
  ))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Only admins can read audit logs
CREATE POLICY "admins_can_read_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
      AND role_name IN ('admin', 'super_admin')
    )
  );

-- Policy 2: Service role can insert (for triggers via service account)
CREATE POLICY "service_can_insert_audit_logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true); -- Triggers insert via service role, not user role

-- Policy 3: Prevent updates/deletes (audit logs are immutable)
CREATE POLICY "audit_logs_no_update" ON public.audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "audit_logs_no_delete" ON public.audit_logs
  FOR DELETE
  USING (false);

-- Create function to safely log admin role assignments
-- This function will be called by triggers
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action VARCHAR,
  p_table_name VARCHAR,
  p_record_id VARCHAR,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_description,
    NOW()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  -- Prevent audit failures from breaking main operations
  -- Log error to console but don't raise
  RAISE WARNING 'Audit logging failed for action % on table %: %', 
    p_action, p_table_name, SQLERRM;
  RETURN NULL;
END;
$$;

-- Create function to log admin role assignment changes
-- Triggers will be set up separately in config/triggers.sql
CREATE OR REPLACE FUNCTION public.trigger_audit_admin_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action VARCHAR;
  v_current_user_id UUID;
BEGIN
  -- Get current user from JWT (for context)
  -- In real implementation, this would come from request context
  v_current_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'admin_role_assigned';
    PERFORM public.log_audit_event(
      COALESCE(v_current_user_id, NEW.user_id),
      v_action,
      'user_role_assignments',
      NEW.user_id::VARCHAR,
      NULL,
      jsonb_build_object('role_name', NEW.role_name, 'granted_at', NOW()),
      'Admin role ' || NEW.role_name || ' assigned to user'
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'admin_role_removed';
    PERFORM public.log_audit_event(
      COALESCE(v_current_user_id, OLD.user_id),
      v_action,
      'user_role_assignments',
      OLD.user_id::VARCHAR,
      jsonb_build_object('role_name', OLD.role_name, 'revoked_at', NOW()),
      NULL,
      'Admin role ' || OLD.role_name || ' removed from user'
    );
  END IF;
  
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Prevent trigger failures from breaking main operations
  RAISE WARNING 'Audit trigger failed for user_role_assignments: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Note: Actual triggers are NOT created in this migration to minimize risk
-- They should be created separately after verification in a non-production environment
-- Examples:
-- 
-- CREATE TRIGGER audit_admin_role_insert
--   AFTER INSERT ON public.user_role_assignments
--   FOR EACH ROW
--   EXECUTE FUNCTION public.trigger_audit_admin_role_changes();
--
-- CREATE TRIGGER audit_admin_role_delete
--   AFTER DELETE ON public.user_role_assignments
--   FOR EACH ROW
--   EXECUTE FUNCTION public.trigger_audit_admin_role_changes();
--
-- To enable triggers after testing, run:
-- mysql> CREATE TRIGGER audit_admin_role_insert AFTER INSERT ON public.user_role_assignments FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_admin_role_changes();
-- mysql> CREATE TRIGGER audit_admin_role_delete AFTER DELETE ON public.user_role_assignments FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_admin_role_changes();

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_audit_admin_role_changes TO authenticated;

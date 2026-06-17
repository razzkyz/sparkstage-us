-- ============================================
-- Migration: Enable Audit Logging Triggers
-- Date: 2026-05-20
-- Description: 
--   Activates triggers to log all admin role changes.
--   This migration should be applied AFTER testing in dev environment.
-- ============================================

-- Enable triggers for admin role changes
-- These will automatically log when roles are assigned or revoked

DROP TRIGGER IF EXISTS audit_admin_role_insert ON public.user_role_assignments;
CREATE TRIGGER audit_admin_role_insert
  AFTER INSERT ON public.user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_audit_admin_role_changes();

DROP TRIGGER IF EXISTS audit_admin_role_delete ON public.user_role_assignments;
CREATE TRIGGER audit_admin_role_delete
  AFTER DELETE ON public.user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_audit_admin_role_changes();

-- Verify triggers are active
COMMENT ON TRIGGER audit_admin_role_insert ON public.user_role_assignments IS 'Logs admin role assignments for audit trail';
COMMENT ON TRIGGER audit_admin_role_delete ON public.user_role_assignments IS 'Logs admin role revocations for audit trail';

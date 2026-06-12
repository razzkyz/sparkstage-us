-- Add user_id column to stage_scans so customer scans can be tracked per user
ALTER TABLE public.stage_scans
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for efficient lookup of "which stage is user X at?"
CREATE INDEX IF NOT EXISTS idx_stage_scans_user_id_scanned_at
  ON public.stage_scans(user_id, scanned_at DESC);

-- Index for "who is currently at stage Y?" queries
CREATE INDEX IF NOT EXISTS idx_stage_scans_stage_id_user_id_scanned_at
  ON public.stage_scans(stage_id, user_id, scanned_at DESC);

-- Update RLS INSERT policy to allow authenticated users to include their own user_id
DROP POLICY IF EXISTS "Public can record active stage scans" ON public.stage_scans;
CREATE POLICY "Public can record active stage scans"
  ON public.stage_scans
  FOR INSERT
  TO public
  WITH CHECK (
    purchased_ticket_id IS NULL
    AND scanned_at >= NOW() - INTERVAL '10 minutes'
    AND scanned_at <= NOW() + INTERVAL '1 minute'
    -- user_id must be null (anonymous) OR match the authenticated user
    AND (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.stages
      WHERE public.stages.id = stage_id
        AND public.stages.status = 'active'
    )
  );

-- Allow users to view their own scans
DROP POLICY IF EXISTS "Users can view own scans" ON public.stage_scans;
CREATE POLICY "Users can view own scans"
  ON public.stage_scans
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RPC: get current stage location of all users (admin only)
-- Returns the most recent stage scan per user within the last 4 hours
CREATE OR REPLACE FUNCTION public.get_current_user_stage_locations()
RETURNS TABLE (
  user_id       UUID,
  display_name  TEXT,
  email         TEXT,
  stage_id      INT,
  stage_name    TEXT,
  stage_code    TEXT,
  stage_zone    TEXT,
  scanned_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (ss.user_id)
    ss.user_id,
    COALESCE(p.full_name, au.email, 'Unknown') AS display_name,
    au.email,
    s.id            AS stage_id,
    s.name          AS stage_name,
    s.code          AS stage_code,
    s.zone          AS stage_zone,
    ss.scanned_at
  FROM public.stage_scans ss
  JOIN public.stages s ON s.id = ss.stage_id
  JOIN auth.users au ON au.id = ss.user_id
  LEFT JOIN public.profiles p ON p.id = ss.user_id
  WHERE
    ss.user_id IS NOT NULL
    AND ss.scanned_at >= NOW() - INTERVAL '4 hours'
    AND s.status = 'active'
  ORDER BY ss.user_id, ss.scanned_at DESC;
END;
$$;

-- Grant execute to authenticated (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.get_current_user_stage_locations() TO authenticated;

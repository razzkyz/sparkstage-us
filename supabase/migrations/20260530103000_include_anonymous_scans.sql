-- Update get_recent_stage_scans to include anonymous scans (user_id IS NULL)
DROP FUNCTION IF EXISTS public.get_recent_stage_scans(INT);

CREATE OR REPLACE FUNCTION public.get_recent_stage_scans(limit_count INT DEFAULT 50)
RETURNS TABLE (
  scan_id       TEXT,
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
  SELECT
    ss.id::TEXT AS scan_id,
    ss.user_id,
    COALESCE(p.full_name, au.email, 'Anonymous (Not Logged In)') AS display_name,
    COALESCE(au.email, '-') AS email,
    s.id            AS stage_id,
    s.name          AS stage_name,
    s.code          AS stage_code,
    s.zone          AS stage_zone,
    ss.scanned_at
  FROM public.stage_scans ss
  JOIN public.stages s ON s.id = ss.stage_id
  LEFT JOIN auth.users au ON au.id = ss.user_id
  LEFT JOIN public.profiles p ON p.id = ss.user_id
  WHERE
    s.status = 'active'
  ORDER BY ss.scanned_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_stage_scans(INT) TO authenticated;

-- Reload schema cache immediately
NOTIFY pgrst, 'reload schema';

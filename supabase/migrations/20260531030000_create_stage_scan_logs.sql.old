-- Stage Scan Logs: tabel baru untuk tracking siapa yang scan stage QR
-- UUID primary key = bersih, tidak ada ambiguitas tipe data

CREATE TABLE IF NOT EXISTS public.stage_scan_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id    INT NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_stage_scan_logs_user_id      ON public.stage_scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_stage_scan_logs_stage_id     ON public.stage_scan_logs(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_scan_logs_scanned_at   ON public.stage_scan_logs(scanned_at DESC);

-- Enable RLS
ALTER TABLE public.stage_scan_logs ENABLE ROW LEVEL SECURITY;

-- User hanya bisa INSERT log miliknya sendiri
CREATE POLICY "Users can insert own scan logs"
  ON public.stage_scan_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin bisa melihat semua log
CREATE POLICY "Admins can read all scan logs"
  ON public.stage_scan_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- User bisa melihat log miliknya sendiri
CREATE POLICY "Users can read own scan logs"
  ON public.stage_scan_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RPC: ambil log scan terbaru untuk admin dashboard
CREATE OR REPLACE FUNCTION public.get_stage_scan_logs(limit_count INT DEFAULT 50)
RETURNS TABLE (
  id           UUID,
  user_id      UUID,
  display_name TEXT,
  email        TEXT,
  stage_id     INT,
  stage_name   TEXT,
  stage_code   TEXT,
  stage_zone   TEXT,
  scanned_at   TIMESTAMPTZ
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
    sl.id,
    sl.user_id,
    COALESCE(p.full_name, au.email, 'Unknown') AS display_name,
    COALESCE(au.email, '-')                    AS email,
    s.id                                       AS stage_id,
    s.name                                     AS stage_name,
    s.code                                     AS stage_code,
    s.zone                                     AS stage_zone,
    sl.scanned_at
  FROM public.stage_scan_logs sl
  JOIN public.stages s      ON s.id = sl.stage_id
  JOIN auth.users au         ON au.id = sl.user_id
  LEFT JOIN public.profiles p ON p.id = sl.user_id
  ORDER BY sl.scanned_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stage_scan_logs(INT) TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

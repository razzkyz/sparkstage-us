-- ============================================
-- Migration: Rename reconcile payment cron to DOKU naming
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  existing_job_id BIGINT;
  job_name TEXT;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'reconcile-midtrans-payments',
    'reconcile-midtrans-payments-every-5-minutes',
    'reconcile-doku-payments',
    'reconcile-doku-payments-every-5-minutes'
  ]
  LOOP
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = job_name;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
      existing_job_id := NULL;
    END IF;
  END LOOP;

  PERFORM cron.schedule(
    'reconcile-doku-payments-every-5-minutes',
    '*/5 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://hogzjapnkvsihvvbgcdb.supabase.co/functions/v1/reconcile-doku-payments',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END;
$$;

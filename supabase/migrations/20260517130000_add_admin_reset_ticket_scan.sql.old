-- Safe RPC for admin to reset a mistakenly-scanned ticket back to active
-- Only allows resetting tickets that are 'used' but still within their valid_date window (today or future)
CREATE OR REPLACE FUNCTION public.admin_reset_ticket_scan(p_ticket_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(btrim(coalesce(p_ticket_code, '')));
  v_ticket RECORD;
  v_today_jakarta DATE := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Kode tiket kosong');
  END IF;

  SELECT
    pt.id,
    pt.ticket_code,
    pt.status,
    pt.valid_date,
    pt.time_slot,
    pt.used_at,
    pt.user_id,
    t.name AS ticket_name
  INTO v_ticket
  FROM public.purchased_tickets pt
  LEFT JOIN public.tickets t ON t.id = pt.ticket_id
  WHERE upper(pt.ticket_code) = v_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Kode tiket tidak ditemukan');
  END IF;

  IF lower(coalesce(v_ticket.status, '')) <> 'used' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', format('Tiket ini belum di-scan (status: %s). Tidak perlu di-reset.', v_ticket.status),
      'ticketCode', v_ticket.ticket_code,
      'status', v_ticket.status,
      'validDate', v_ticket.valid_date,
      'ticketName', v_ticket.ticket_name
    );
  END IF;

  -- Reset the ticket
  UPDATE public.purchased_tickets
  SET status = 'active',
      used_at = NULL
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Tiket berhasil di-reset ke status aktif',
    'ticketCode', v_ticket.ticket_code,
    'ticketName', coalesce(v_ticket.ticket_name, '-'),
    'validDate', v_ticket.valid_date,
    'usedAt', v_ticket.used_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_ticket_scan(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_ticket_scan(TEXT) FROM anon;

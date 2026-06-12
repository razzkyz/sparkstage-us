-- Grant to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.hide_user_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_user_order(TEXT) TO service_role;

-- Also notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

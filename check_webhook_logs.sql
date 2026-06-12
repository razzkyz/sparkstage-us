SELECT order_number, event_type, success, error_message,
       payload->'diagnostics'->>'reason' as reason,
       payload->'diagnostics'->>'actual_request_pathname' as request_path,
       created_at
FROM webhook_logs
WHERE order_number = 'SPK-1777988796659-RCUUK'
   OR created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

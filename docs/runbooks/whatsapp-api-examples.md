# WhatsApp Invoice API - Example Fetch Requests

## 1. Send Invoice Immediately

### TypeScript/JavaScript (Frontend)

```typescript
async function sendInvoice(orderNumber: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-invoice`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          orderNumber: orderNumber,
          orderType: 'ticket',
          forceSend: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('WhatsApp invoice sent:', data);
    return data;
  } catch (error) {
    console.error('Failed to send WhatsApp invoice:', error);
    throw error;
  }
}

// Usage
await sendInvoice('TKT-240513-ABC123');
```

### Python

```python
import requests
import json
from typing import Optional

def send_whatsapp_invoice(
    order_number: str,
    order_type: str = 'ticket',
    force_send: bool = False,
    supabase_url: str = "https://your-project.supabase.co",
    auth_token: str = "YOUR_ANON_KEY"
) -> dict:
    """
    Send WhatsApp invoice via Fonnte API
    
    Args:
        order_number: Invoice number (e.g., 'TKT-240513-ABC123')
        order_type: 'ticket' or 'product'
        force_send: Skip duplicate check
        supabase_url: Supabase project URL
        auth_token: Supabase anon key
        
    Returns:
        Response dict with status and message ID
    """
    url = f"{supabase_url}/functions/v1/send-whatsapp-invoice"
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {auth_token}',
    }
    
    payload = {
        'orderNumber': order_number,
        'orderType': order_type,
        'forceSend': force_send,
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    return response.json()

# Usage
result = send_whatsapp_invoice('TKT-240513-ABC123')
print(f"Status: {result['status']}")
print(f"Message ID: {result['messageId']}")
```

### cURL

```bash
# Basic usage
curl -X POST \
  https://your-project.supabase.co/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "orderNumber": "TKT-240513-ABC123",
    "orderType": "ticket",
    "forceSend": false
  }'

# With environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="YOUR_ANON_KEY"
export ORDER_NUMBER="TKT-240513-ABC123"

curl -X POST \
  $SUPABASE_URL/functions/v1/send-whatsapp-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -d "{\"orderNumber\": \"$ORDER_NUMBER\"}"
```

## 2. Force Resend (Bypass Duplicate Check)

```typescript
// Force resend even if already sent
async function forceResendInvoice(orderNumber: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-invoice`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        orderNumber,
        forceSend: true,  // ← Important!
      }),
    }
  );

  return response.json();
}

await forceResendInvoice('TKT-240513-ABC123');
```

## 3. Send Product Order Invoice

```typescript
async function sendProductInvoice(orderNumber: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-invoice`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        orderNumber,
        orderType: 'product',  // ← Product instead of ticket
      }),
    }
  );

  return response.json();
}
```

## 4. Backend Service Role Call (With Full Permissions)

```typescript
// File: supabase/functions/custom-function/index.ts
import { createServiceClient } from '../_shared/supabase.ts';
import { getSupabaseEnv } from '../_shared/env.ts';

export async function sendInvoiceFromBackend(orderNumber: string) {
  const { url, serviceRoleKey } = getSupabaseEnv();
  const supabase = createServiceClient(url, serviceRoleKey);

  // Option 1: Call sendWhatsAppInvoiceViaFontneIfNeeded directly
  import { sendWhatsAppInvoiceViaFontneIfNeeded } from '../_shared/payment-effects.ts';
  
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, user_id, status')
    .eq('order_number', orderNumber)
    .single();

  if (order) {
    const result = await sendWhatsAppInvoiceViaFontneIfNeeded({
      supabase,
      order: order as any,
      orderType: 'ticket',
      nowIso: new Date().toISOString(),
    });
    
    return result;
  }

  throw new Error('Order not found');
}
```

## 5. Batch Send Multiple Orders

```typescript
async function sendMultipleInvoices(orderNumbers: string[]) {
  const results = await Promise.allSettled(
    orderNumbers.map(orderNumber =>
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ orderNumber }),
        }
      ).then(r => r.json())
    )
  );

  return {
    total: orderNumbers.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    results,
  };
}

// Usage
const batch = await sendMultipleInvoices([
  'TKT-240513-ABC123',
  'TKT-240513-DEF456',
  'TKT-240513-GHI789',
]);

console.log(`Sent ${batch.successful}/${batch.total}`);
```

## 6. Scheduled Batch Job (Cron)

```typescript
// File: supabase/functions/send-pending-invoices/index.ts
// Deploy with: https://supabase.com/docs/guides/functions/schedule-functions

import { serve } from "../_shared/deps.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getSupabaseEnv } from "../_shared/env.ts";
import { sendWhatsAppInvoiceViaFontneIfNeeded } from "../_shared/payment-effects.ts";

serve(async () => {
  const { url, serviceRoleKey } = getSupabaseEnv();
  const supabase = createServiceClient(url, serviceRoleKey);

  // Find orders with failed or missing WhatsApp messages
  const { data: failedOrders } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      whatsapp_messages:whatsapp_messages(delivery_status)
    `)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(50);

  let sent = 0;
  let skipped = 0;

  for (const order of failedOrders || []) {
    const hasMessage =
      order.whatsapp_messages &&
      Array.isArray(order.whatsapp_messages) &&
      order.whatsapp_messages.length > 0;

    if (hasMessage) {
      skipped++;
      continue;
    }

    try {
      await sendWhatsAppInvoiceViaFontneIfNeeded({
        supabase,
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
        } as any,
        orderType: "ticket",
        nowIso: new Date().toISOString(),
      });
      sent++;
    } catch (error) {
      console.error(`Failed for ${order.order_number}:`, error);
    }
  }

  return new Response(
    JSON.stringify({
      message: "Batch send completed",
      sent,
      skipped,
      total: failedOrders?.length || 0,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

Deploy cron job:
```bash
supabase functions deploy send-pending-invoices --project-ref your-project
```

## 7. Webhook Post-Payment Integration

```typescript
// File: supabase/functions/doku-webhook/index.ts
// After marking order as paid:

import { sendWhatsAppInvoiceViaFontneIfNeeded } from "../_shared/payment-effects.ts";

// Inside webhook handler after successful payment
if (providerStatus === "paid") {
  // ... existing payment processing ...

  // Send WhatsApp invoice
  try {
    const whatsappResult = await sendWhatsAppInvoiceViaFontneIfNeeded({
      supabase,
      order: ticketOrder,
      orderType: "ticket",
      nowIso: new Date().toISOString(),
    });

    console.log("WhatsApp invoice result:", whatsappResult);
  } catch (error) {
    // Log but don't fail the webhook
    console.error("Failed to send WhatsApp invoice:", error);
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: "whatsapp_invoice_send_error",
      payload: { error: String(error) },
      success: false,
      errorMessage: String(error),
      processedAt: new Date().toISOString(),
    });
  }
}
```

## 8. React Hook for Sending Invoice

```typescript
// File: frontend/src/hooks/useWhatsAppInvoice.ts
import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";

export function useWhatsAppInvoice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvoice = useCallback(
    async (orderNumber: string, forceSend = false) => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await supabase.functions.invoke(
          "send-whatsapp-invoice",
          {
            body: { orderNumber, forceSend },
          }
        );

        if (err) throw err;

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { sendInvoice, loading, error };
}

// Usage in component
export function BookingSuccessPage() {
  const { sendInvoice, loading } = useWhatsAppInvoice();

  return (
    <button
      onClick={() => sendInvoice("TKT-240513-ABC123")}
      disabled={loading}
    >
      {loading ? "Sending..." : "Resend Invoice via WhatsApp"}
    </button>
  );
}
```

## 9. Error Handling Examples

```typescript
async function sendInvoiceWithErrorHandling(orderNumber: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-invoice`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ orderNumber }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      switch (data.code) {
        case 'ORDER_NOT_FOUND':
          console.error('Order not found:', orderNumber);
          break;
        case 'NO_PHONE_NUMBER':
          console.warn('Customer phone not found, skipping WhatsApp');
          break;
        case 'SEND_FAILED':
          console.error('Fonnte API failed:', data.details?.fonnte_error);
          // Retry logic here
          break;
        default:
          console.error('Unknown error:', data);
      }
      return null;
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

## 10. Monitoring & Logging

```typescript
// Query sent messages
async function checkMessageStatus(orderNumber: string) {
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('order_number', orderNumber)
    .order('created_at', { ascending: false });

  return data;
}

// Get statistics
async function getWhatsAppStats() {
  const { data } = await supabase.rpc('get_whatsapp_stats');
  return data;
}

// Example stats response:
// {
//   "total_sent": 1250,
//   "total_failed": 45,
//   "success_rate": 96.4,
//   "today_sent": 28,
//   "pending_delivery": 3
// }
```

## Response Examples

### Success (200)
```json
{
  "status": "success",
  "message": "WhatsApp invoice sent successfully",
  "orderNumber": "TKT-240513-ABC123",
  "messageId": "fonnte_123456789"
}
```

### Already Sent (200 - Skipped)
```json
{
  "status": "skipped",
  "message": "Message already sent previously",
  "orderNumber": "TKT-240513-ABC123"
}
```

### Error (400)
```json
{
  "error": "Invalid request: missing or invalid orderNumber",
  "code": "INVALID_REQUEST"
}
```

### Error (500)
```json
{
  "error": "Failed to send WhatsApp message",
  "code": "SEND_FAILED",
  "details": {
    "fonnte_error": "Invalid phone number format",
    "fonnte_details": { ... }
  }
}
```

## Testing Checklist

- [ ] FONNTE_API_TOKEN is set in Supabase secrets
- [ ] Test with real phone number
- [ ] Verify message format in WhatsApp
- [ ] Check whatsapp_messages table has entry
- [ ] Test duplicate prevention
- [ ] Test forceSend=true bypass
- [ ] Test with invalid phone number
- [ ] Verify error logging in webhook_logs
- [ ] Load test with multiple orders

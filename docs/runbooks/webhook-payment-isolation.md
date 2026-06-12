# Webhook Payment Isolation Safeguards

## Overview

The `doku-webhook` Edge Function now includes **payment type validation** to prevent cross-type payment processing at the backend. This extends the frontend payment isolation fix to ensure **end-to-end payment type segregation**.

**CRITICAL REQUIREMENT**: Product and Ticket payments MUST be isolated.

## Changes Made

### 1. New Helper Functions

#### `extractPaymentTypeFromInvoice(invoiceNumber: string)`
Extracts the payment type from invoice prefix:
- `PRD-*` → `'product'` payment type
- `SPK-*` → `'ticket'` payment type  
- Any other prefix → `null` (unknown/legacy)

**Purpose**: Identify payment type early from the invoice number before database lookup.

#### `validatePaymentTypeMatch(foundOrderType, invoicePaymentType, orderNumber)`
Validates that the found order type matches the invoice type:
- Returns `true` if types match (safe to process)
- Returns `false` if types mismatch (CRITICAL ERROR)
- Logs detailed error information when mismatch detected
- Allows legacy invoices without proper prefix (backward compatibility)

**Purpose**: Detect payment type mismatches before processing transitions.

### 2. Webhook Processing Flow

#### Step 1: Extract Payment Type (Early)
```typescript
const invoicePaymentType = extractPaymentTypeFromInvoice(orderNumber)
// Logs: PRD- → 'product', SPK- → 'ticket', other → null
```

#### Step 2: Process Product Orders (With Validation)
```typescript
if (productOrder) {
  // CRITICAL: Validate payment type before processing
  const isPaymentTypeValid = validatePaymentTypeMatch('product', invoicePaymentType, orderNumber)
  
  if (!isPaymentTypeValid) {
    // Log CRITICAL error and reject with 422 error
    return jsonErrorWithDetails(422, {
      error: 'Payment type mismatch',
      code: 'PAYMENT_TYPE_MISMATCH'
    })
  }
  
  // Safe to process product order transition
  await processProductOrderTransition(...)
}
```

#### Step 3: Process Ticket Orders (With Validation)
```typescript
if (order) {
  // CRITICAL: Validate payment type before processing
  const isPaymentTypeValid = validatePaymentTypeMatch('ticket', invoicePaymentType, orderNumber)
  
  if (!isPaymentTypeValid) {
    // Log CRITICAL error and reject with 422 error
    return jsonErrorWithDetails(422, {
      error: 'Payment type mismatch',
      code: 'PAYMENT_TYPE_MISMATCH'
    })
  }
  
  // Safe to process ticket order transition
  await processTicketOrderTransition(...)
}
```

## Error Handling

When payment type mismatch is detected:

1. **Status Code**: `422 Unprocessable Entity`
2. **Error Response**:
   ```json
   {
     "error": "Payment type mismatch",
     "code": "PAYMENT_TYPE_MISMATCH",
     "details": "Invoice type product does not match found order type ticket"
   }
   ```

3. **Logging**: 
   - Logged as `'payment_type_mismatch'` event type
   - Records both the invoice type and found order type
   - Includes full notification payload for debugging
   - Marked as `success: false`

## Edge Cases Handled

### Legacy Invoices Without Proper Prefix
- When `invoicePaymentType` is `null`, validation passes
- Logs warning: `"Unknown invoice type prefix for {orderNumber}..."`
- Allows backward compatibility during transition period

### Order Not Found
- If order lookup fails before payment type validation, webhook continues through other tables
- Print orders are attempted if ticket order not found
- Payment type validation only applies when order is found

## Deployment Checklist

- [ ] Deploy updated `doku-webhook/index.ts` to staging
- [ ] Monitor webhook logs for any `'payment_type_mismatch'` events
- [ ] Test product → ticket navigation flow
- [ ] Test ticket → product navigation flow
- [ ] Verify invoice prefixes are correctly set (PRD-, SPK-)
- [ ] Deploy to production

## Testing Scenarios

### Scenario 1: Correct Flows (Should Succeed)
1. Product checkout → PRD-* invoice → webhook processes as product ✓
2. Ticket checkout → SPK-* invoice → webhook processes as ticket ✓

### Scenario 2: Mismatch Detection (Should Fail)
1. Product checkout → SPK-* invoice → webhook rejects with 422 ✓
2. Ticket checkout → PRD-* invoice → webhook rejects with 422 ✓

### Scenario 3: Legacy Fallback (Should Warn)
1. Old invoice format without prefix → logs warning but processes ✓

## Monitoring

Check webhook logs for these fields:
- `event_type: 'payment_type_mismatch'` - indicates type mismatch detected
- `success: false` with `errorMessage: 'Payment type mismatch...'` - failed validation

These indicate potential payment isolation breaches that need investigation.

## Related Files

- [Frontend Payment Isolation](../docs/PAYMENT_ISOLATION_FIX.md) - Frontend fix for clearing DOKU SDK state
- [DOKU Payments Runbook](./doku-payments.md) - Complete DOKU payment flow documentation
- `supabase/functions/doku-webhook/index.ts` - Webhook implementation
- `supabase/functions/_shared/payment-processors.ts` - Order transition logic

## Summary

The webhook now provides **three layers of payment isolation**:

1. **Invoice Prefix** (PRD- vs SPK-) - identifies type at entry
2. **Type Validation** (validatePaymentTypeMatch) - validates before processing
3. **Order Segregation** (order_products vs orders tables) - stored separately

This prevents a scenario where a PRD- (product) invoice could be accidentally applied to a ticket order, or vice versa.

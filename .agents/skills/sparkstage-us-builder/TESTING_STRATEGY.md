# Testing Strategy - SparkStage US

## Test Environment Setup

### Stripe Test Mode
- Use test API keys (pk_test_... and sk_test_...)
- No real money charged
- Test cards provided by Stripe
- Full webhook testing available

### Test Cards

```
✅ Success (Visa)
Card: 4242 4242 4242 4242
CVC: Any 3 digits
Date: Any future date
ZIP: Any 5 digits

❌ Card Declined
Card: 4000 0000 0000 0002

❌ Insufficient Funds
Card: 4000 0000 0000 9995

🔒 Requires Authentication (3D Secure)
Card: 4000 0025 0000 3155

⏱️ Processing Delay (asynchronous)
Card: 4000 0000 0000 3220
```

## Testing Workflow

### 1. Local Development Testing

```bash
# Start Supabase locally
npm run supabase:start

# Start frontend dev server
cd frontend
npm run dev

# In another terminal, start Stripe webhook forwarding
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_xxxxx
> Forwarding webhooks to http://localhost:54321/functions/v1/stripe-webhook
```

### 2. Test Scenarios

#### Scenario 1: Successful Ticket Purchase

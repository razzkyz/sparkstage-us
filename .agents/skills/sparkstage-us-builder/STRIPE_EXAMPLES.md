# Stripe Integration - Complete Code Examples

## Table of Contents
1. [Edge Function: Create Payment Intent](#edge-function-create-payment-intent)
2. [Edge Function: Webhook Handler](#edge-function-webhook-handler)
3. [Frontend: Payment Form](#frontend-payment-form)
4. [Shared: Payment Effects](#shared-payment-effects)
5. [Testing Examples](#testing-examples)

## Edge Function: Create Payment Intent

### Ticket Checkout

```typescript
// supabase/functions/create-stripe-ticket-checkout/index.ts
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateCheckoutRequest {
  orderId: string
  amount: number
  customerEmail: string
  customerName: string
  customerPhone?: string
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderId, amount, customerEmail, customerName, customerPhone } = 
      await req.json() as CreateCheckoutRequest

    // Validate inputs
    if (!orderId || !amount || !customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch order to validate it exists
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if order already has payment intent
    if (order.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'Order already has payment intent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      metadata: {
        order_id: orderId,

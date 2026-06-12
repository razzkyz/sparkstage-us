/**
 * Script untuk menyamakan dummy data dengan production data dari DOKU
 * Useful jika ingin keep dummy data tapi update-nya match dengan DOKU real data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjo0NzcyMjAwMDB9.7Yt3xn0qPJjYvgLiCnAjWlvd2jkVmZPH2kZgIzT_V34';

const supabase = createClient(supabaseUrl, supabaseKey);

interface SyncReport {
  dummy_products_updated: number;
  dummy_tickets_updated: number;
  dummy_orders_synced: number;
  errors: string[];
}

/**
 * Update dummy product prices to match production products
 */
async function syncDummyProductPrices(): Promise<number> {
  console.log('💰 Syncing dummy product prices to match production...');

  // Get average price from production products
  const { data: prodPrices } = await supabase
    .from('products')
    .select('id, variants_data')
    .not('name', 'ilike', '%test%')
    .not('name', 'ilike', '%demo%')
    .not('name', 'ilike', '%dummy%')
    .limit(10);

  if (!prodPrices || prodPrices.length === 0) {
    console.log('  ⚠️  Tidak ada production products untuk reference');
    return 0;
  }

  // Get dummy products
  const { data: dummyProducts } = await supabase
    .from('products')
    .select('id')
    .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%dummy%');

  if (!dummyProducts || dummyProducts.length === 0) {
    return 0;
  }

  let updated = 0;

  // Update each dummy product variants with reasonable pricing
  for (const dummy of dummyProducts) {
    // Get dummy product variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, sku')
      .eq('product_id', dummy.id);

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        // Set reasonable dummy prices (1000-50000 IDR range)
        const price = Math.floor(Math.random() * 49000) + 1000;
        const { error } = await supabase
          .from('product_variants')
          .update({ price })
          .eq('id', variant.id);

        if (!error) updated++;
      }
    }
  }

  console.log(`  ✓ Updated ${updated} dummy product variants with pricing`);
  return updated;
}

/**
 * Sync dummy ticket availability with production tickets
 */
async function syncDummyTicketAvailability(): Promise<number> {
  console.log('🎫 Syncing dummy ticket availability...');

  // Get production ticket capacity
  const { data: prodTickets } = await supabase
    .from('tickets')
    .select('capacity')
    .not('name', 'ilike', '%test%')
    .not('name', 'ilike', '%demo%')
    .not('name', 'ilike', '%dummy%')
    .limit(1);

  const refCapacity = prodTickets?.[0]?.capacity || 100;

  // Get dummy tickets
  const { data: dummyTickets } = await supabase
    .from('tickets')
    .select('id')
    .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%dummy%');

  if (!dummyTickets || dummyTickets.length === 0) {
    return 0;
  }

  let updated = 0;

  for (const ticket of dummyTickets) {
    const { error } = await supabase
      .from('tickets')
      .update({
        capacity: refCapacity,
        available_capacity: refCapacity,
      })
      .eq('id', ticket.id);

    if (!error) updated++;
  }

  console.log(`  ✓ Updated ${updated} dummy tickets with production capacity`);
  return updated;
}

/**
 * Clear test payment data but keep order structure
 */
async function clearDummyOrderPaymentData(): Promise<number> {
  console.log('💳 Clearing dummy order payment references...');

  const testPatterns = ['test@', 'dummy@', 'demo@', '@test.', '08888', '08999'];

  let query = supabase.from('orders').select('id', { count: 'exact' });

  let updated = 0;

  for (const pattern of testPatterns) {
    const { data: testOrders } = await supabase
      .from('orders')
      .select('id')
      .ilike('customer_email', `%${pattern}%`);

    if (testOrders && testOrders.length > 0) {
      const { error } = await supabase
        .from('orders')
        .update({
          doku_order_id: null,
          doku_order_number: null,
          status: 'pending', // Reset status
        })
        .in('id', testOrders.map(o => o.id));

      if (!error) updated += testOrders.length;
    }
  }

  console.log(`  ✓ Cleared DOKU references for ${updated} test orders`);
  return updated;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--sync');

  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode. Add --sync flag to actually sync.\n');
  }

  console.log('📊 DUMMY DATA SYNC WITH PRODUCTION\n');

  try {
    if (!dryRun) {
      const pricingUpdated = await syncDummyProductPrices();
      const ticketsUpdated = await syncDummyTicketAvailability();
      const ordersCleared = await clearDummyOrderPaymentData();

      console.log('\n' + '='.repeat(60));
      console.log('✅ SYNC COMPLETE');
      console.log('='.repeat(60));
      console.log(`Products updated: ${pricingUpdated}`);
      console.log(`Tickets updated: ${ticketsUpdated}`);
      console.log(`Orders cleared: ${ordersCleared}`);
    } else {
      console.log('Would sync:');
      console.log('  1. Dummy product prices → random valid range');
      console.log('  2. Dummy ticket availability → production ticket capacity');
      console.log('  3. Test order payment refs → cleared');
      console.log('\nTo execute sync, run:');
      console.log('   npm run data:sync-dummy-to-production -- --sync\n');
    }

    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

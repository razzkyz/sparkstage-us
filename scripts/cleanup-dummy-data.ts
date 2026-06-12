/**
 * Script untuk membersihkan dummy data dengan cascade delete yang aman
 * Deletion order:
 * 1. order_products yang linked ke dummy products/orders
 * 2. orders yang merupakan test orders
 * 3. product_variants dari dummy products
 * 4. products yang dummy
 * 5. tickets yang dummy
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjo0NzcyMjAwMDB9.7Yt3xn0qPJjYvgLiCnAjWlvd2jkVmZPH2kZgIzT_V34';

const supabase = createClient(supabaseUrl, supabaseKey);

interface CleanupStats {
  deletedOrderProducts: number;
  deletedOrders: number;
  deletedProductVariants: number;
  deletedProducts: number;
  deletedTickets: number;
  errors: string[];
}

async function cleanupDummyData(dryRun: boolean = true): Promise<CleanupStats> {
  const stats: CleanupStats = {
    deletedOrderProducts: 0,
    deletedOrders: 0,
    deletedProductVariants: 0,
    deletedProducts: 0,
    deletedTickets: 0,
    errors: [],
  };

  console.log(`\n${dryRun ? '🧹 DRY RUN - ' : '🗑️  '}CLEANUP DUMMY DATA\n`);

  // Step 1: Identify dummy products
  const { data: dummyProducts } = await supabase
    .from('products')
    .select('id')
    .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%dummy%');

  const dummyProductIds = dummyProducts?.map(p => p.id) || [];

  // Step 2: Identify test orders
  const testPatterns = ['test@', 'dummy@', 'demo@', '@test.', '08888', '08999'];
  const { data: testOrders } = await supabase
    .from('orders')
    .select('id')
    .or(testPatterns.map(p => `customer_email.ilike.%${p}%`).join(','));

  const testOrderIds = testOrders?.map(o => o.id) || [];

  console.log(`Found: ${dummyProductIds.length} dummy products, ${testOrderIds.length} test orders\n`);

  try {
    // Step 3: Delete order_products linked to dummy data
    if (dummyProductIds.length > 0 || testOrderIds.length > 0) {
      console.log('📋 Step 1: Deleting order_products...');
      let query = supabase.from('order_products');

      if (dummyProductIds.length > 0) {
        const { data: linkedOp } = await supabase
          .from('order_products')
          .select('id')
          .in('product_id', dummyProductIds);

        if (linkedOp && linkedOp.length > 0) {
          if (!dryRun) {
            const { error } = await supabase
              .from('order_products')
              .delete()
              .in('product_id', dummyProductIds);
            if (error) throw error;
          }
          stats.deletedOrderProducts += linkedOp.length;
          console.log(`   ${dryRun ? '[DRY RUN]' : '✓'} Deleted ${linkedOp.length} order_products from dummy products`);
        }
      }

      if (testOrderIds.length > 0) {
        const { data: linkedOp } = await supabase
          .from('order_products')
          .select('id')
          .in('order_id', testOrderIds);

        if (linkedOp && linkedOp.length > 0) {
          if (!dryRun) {
            const { error } = await supabase
              .from('order_products')
              .delete()
              .in('order_id', testOrderIds);
            if (error) throw error;
          }
          stats.deletedOrderProducts += linkedOp.length;
          console.log(`   ${dryRun ? '[DRY RUN]' : '✓'} Deleted ${linkedOp.length} order_products from test orders`);
        }
      }
    }

    // Step 4: Delete test orders
    if (testOrderIds.length > 0) {
      console.log('\n📋 Step 2: Deleting test orders...');
      if (!dryRun) {
        const { error } = await supabase
          .from('orders')
          .delete()
          .in('id', testOrderIds);
        if (error) throw error;
      }
      stats.deletedOrders = testOrderIds.length;
      console.log(`   ${dryRun ? '[DRY RUN]' : '✓'} Deleted ${testOrderIds.length} test orders`);
    }

    // Step 5: Delete product_variants from dummy products
    if (dummyProductIds.length > 0) {
      console.log('\n📦 Step 3: Deleting product_variants...');
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id')
        .in('product_id', dummyProductIds);

      if (variants && variants.length > 0) {
        if (!dryRun) {
          const { error } = await supabase
            .from('product_variants')
            .delete()
            .in('product_id', dummyProductIds);
          if (error) throw error;
        }
        stats.deletedProductVariants = variants.length;
        console.log(`   ${dryRun ? '[DRY RUN]' : '✓'} Deleted ${variants.length} product_variants`);
      }
    }

    // Step 6: Delete dummy products
    if (dummyProductIds.length > 0) {
      console.log('\n📦 Step 4: Deleting dummy products...');
      if (!dryRun) {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', dummyProductIds);
        if (error) throw error;
      }
      stats.deletedProducts = dummyProductIds.length;
      console.log(`   ${dryRun ? '[DRY RUN]' : '✓'} Deleted ${dummyProductIds.length} dummy products`);
    }

    // Step 7: Delete dummy tickets
    console.log('\n🎫 Step 5: Deleting dummy tickets...');
    const { data: dummyTickets } = await supabase
      .from('tickets')
      .select('id')
      .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%dummy%');

    if (dummyTickets && dummyTickets.length > 0) {
      if (!dryRun) {
        const { error } = await supabase
          .from('tickets')
          .delete()
          .in('id', dummyTickets.map(t => t.id));
        if (error) throw error;
      }
      stats.deletedTickets = dummyTickets.length;
      console.log(`   ${dryRun ? '[DRY RUN]' : '✓'} Deleted ${dummyTickets.length} dummy tickets`);
    }
  } catch (error) {
    stats.errors.push(error instanceof Error ? error.message : String(error));
  }

  return stats;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--confirm');

  if (isDryRun) {
    console.log('⚠️  Running in DRY RUN mode. Add --confirm flag to actually delete.\n');
  }

  try {
    const stats = await cleanupDummyData(isDryRun);

    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP STATS');
    console.log('='.repeat(60));
    console.log(`Deleted order_products: ${stats.deletedOrderProducts}`);
    console.log(`Deleted orders: ${stats.deletedOrders}`);
    console.log(`Deleted product_variants: ${stats.deletedProductVariants}`);
    console.log(`Deleted products: ${stats.deletedProducts}`);
    console.log(`Deleted tickets: ${stats.deletedTickets}`);

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      stats.errors.forEach(e => console.log(`   - ${e}`));
    }

    if (isDryRun && (stats.deletedOrders > 0 || stats.deletedProducts > 0 || stats.deletedTickets > 0)) {
      console.log('\n✅ Dry run successful. To execute deletion, run:');
      console.log('   npm run cleanup:dummy-data -- --confirm\n');
    }

    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

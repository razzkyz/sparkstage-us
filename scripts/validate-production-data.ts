/**
 * Script untuk validate production data dari DOKU
 * Check: products, tickets, dan orders yang valid dan linked ke DOKU
 */

import { createClient } from '@supabase/supabase-js';

interface ProductionDataStats {
  validProducts: number;
  validTickets: number;
  validOrders: number;
  validOrderProducts: number;
  productsWithoutVariants: string[];
  ordersWithoutDokuReference: string[];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjo0NzcyMjAwMDB9.7Yt3xn0qPJjYvgLiCnAjWlvd2jkVmZPH2kZgIzT_V34';

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateProductionData(): Promise<ProductionDataStats> {
  const stats: ProductionDataStats = {
    validProducts: 0,
    validTickets: 0,
    validOrders: 0,
    validOrderProducts: 0,
    productsWithoutVariants: [],
    ordersWithoutDokuReference: [],
  };

  console.log('🔍 Validating Production Data\n');

  // Check valid products (tidak test, ada variants)
  console.log('📦 Checking products...');
  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .not('name', 'ilike', '%test%')
    .not('name', 'ilike', '%demo%')
    .not('name', 'ilike', '%dummy%');

  if (products && products.length > 0) {
    stats.validProducts = products.length;

    for (const prod of products) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id', { count: 'exact' })
        .eq('product_id', prod.id);

      if (!variants || variants.length === 0) {
        stats.productsWithoutVariants.push(prod.id);
      }
    }

    console.log(`✓ Found ${stats.validProducts} valid products`);
    if (stats.productsWithoutVariants.length > 0) {
      console.log(`  ⚠️  ${stats.productsWithoutVariants.length} products without variants`);
    }
  }

  // Check valid tickets
  console.log('\n🎫 Checking tickets...');
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, name')
    .not('name', 'ilike', '%test%')
    .not('name', 'ilike', '%demo%')
    .not('name', 'ilike', '%dummy%');

  if (tickets) {
    stats.validTickets = tickets.length;
    console.log(`✓ Found ${stats.validTickets} valid tickets`);
  }

  // Check valid orders (with DOKU references)
  console.log('\n📋 Checking orders...');
  const { data: orders } = await supabase
    .from('orders')
    .select('id, doku_order_id')
    .not('customer_email', 'ilike', '%test@%')
    .not('customer_email', 'ilike', '%dummy@%')
    .not('customer_email', 'ilike', '%demo@%');

  if (orders) {
    stats.validOrders = orders.length;
    const ordersWithDoku = orders.filter(o => o.doku_order_id).length;
    const ordersWithoutDoku = orders.filter(o => !o.doku_order_id).map(o => o.id);

    console.log(`✓ Found ${stats.validOrders} valid orders`);
    console.log(`  - Linked to DOKU: ${ordersWithDoku}`);
    console.log(`  - Missing DOKU reference: ${ordersWithoutDoku.length}`);

    if (ordersWithoutDoku.length > 0) {
      stats.ordersWithoutDokuReference = ordersWithoutDoku;
    }
  }

  // Check order_products
  console.log('\n📊 Checking order_products...');
  const { count: opCount } = await supabase
    .from('order_products')
    .select('*', { count: 'exact' });

  if (opCount) {
    stats.validOrderProducts = opCount;
    console.log(`✓ Found ${opCount} order_products total`);
  }

  return stats;
}

async function main() {
  try {
    const stats = await validateProductionData();

    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCTION DATA VALIDATION');
    console.log('='.repeat(60));
    console.log(`Valid Products: ${stats.validProducts}`);
    console.log(`Valid Tickets: ${stats.validTickets}`);
    console.log(`Valid Orders: ${stats.validOrders}`);
    console.log(`Order Products: ${stats.validOrderProducts}`);

    if (stats.productsWithoutVariants.length > 0) {
      console.log(`\n⚠️  Products without variants: ${stats.productsWithoutVariants.length}`);
      stats.productsWithoutVariants.slice(0, 5).forEach(id =>
        console.log(`   - ${id}`)
      );
      if (stats.productsWithoutVariants.length > 5) {
        console.log(`   ... and ${stats.productsWithoutVariants.length - 5} more`);
      }
    }

    if (stats.ordersWithoutDokuReference.length > 0) {
      console.log(`\n⚠️  Orders missing DOKU reference: ${stats.ordersWithoutDokuReference.length}`);
      stats.ordersWithoutDokuReference.slice(0, 5).forEach(id =>
        console.log(`   - ${id}`)
      );
      if (stats.ordersWithoutDokuReference.length > 5) {
        console.log(`   ... and ${stats.ordersWithoutDokuReference.length - 5} more`);
      }
    }

    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

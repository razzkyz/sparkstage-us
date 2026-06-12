/**
 * Script untuk mengidentifikasi dan menghapus dummy data
 * Dummy data identifier: 
 * - Products dengan name mengandung 'test', 'demo', 'dummy'
 * - Tickets dengan metadata yang menunjukkan test data
 * - Orders dengan phone/email test patterns
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjo0NzcyMjAwMDB9.7Yt3xn0qPJjYvgLiCnAjWlvd2jkVmZPH2kZgIzT_V34';

const supabase = createClient(supabaseUrl, supabaseKey);

interface DummyDataReport {
  products: Array<{ id: string; name: string; reason: string }>;
  tickets: Array<{ id: string; name: string; reason: string }>;
  orders: Array<{ id: string; customer_name?: string; reason: string }>;
  orderProducts: number;
}

async function identifyDummyData(): Promise<DummyDataReport> {
  console.log('🔍 Scanning untuk dummy data...\n');

  const report: DummyDataReport = {
    products: [],
    tickets: [],
    orders: [],
    orderProducts: 0,
  };

  // Identifikasi dummy products
  console.log('📦 Checking products...');
  const { data: dummyProducts, error: prodErr } = await supabase
    .from('products')
    .select('id, name, description')
    .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%dummy%,description.ilike.%test data%');

  if (prodErr) {
    console.error('❌ Error checking products:', prodErr);
  } else if (dummyProducts && dummyProducts.length > 0) {
    console.log(`✓ Found ${dummyProducts.length} dummy products`);
    for (const prod of dummyProducts) {
      const reason = (prod.name || '').toLowerCase().includes('test') ? 'name contains test'
        : (prod.name || '').toLowerCase().includes('demo') ? 'name contains demo'
        : (prod.name || '').toLowerCase().includes('dummy') ? 'name contains dummy'
        : (prod.description || '').toLowerCase().includes('test data') ? 'description is test data'
        : 'unknown';
      report.products.push({ id: prod.id, name: prod.name || 'N/A', reason });
    }
  }

  // Identifikasi dummy tickets
  console.log('\n🎫 Checking tickets...');
  const { data: dummyTickets, error: tickErr } = await supabase
    .from('tickets')
    .select('id, name, description')
    .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%dummy%');

  if (tickErr) {
    console.error('❌ Error checking tickets:', tickErr);
  } else if (dummyTickets && dummyTickets.length > 0) {
    console.log(`✓ Found ${dummyTickets.length} dummy tickets`);
    for (const ticket of dummyTickets) {
      const reason = (ticket.name || '').toLowerCase().includes('test') ? 'name contains test'
        : (ticket.name || '').toLowerCase().includes('demo') ? 'name contains demo'
        : 'name contains dummy';
      report.tickets.push({ id: ticket.id, name: ticket.name || 'N/A', reason });
    }
  }

  // Identifikasi dummy orders (test emails/phones)
  console.log('\n📋 Checking orders...');
  const testPatterns = ['test@', 'dummy@', 'demo@', '@test.', '08888', '08999'];
  const { data: dummyOrders, error: ordErr } = await supabase
    .from('orders')
    .select('id, customer_name, customer_phone, customer_email')
    .or(testPatterns.map(p => `customer_email.ilike.%${p}%`).join(','));

  if (ordErr) {
    console.error('❌ Error checking orders:', ordErr);
  } else if (dummyOrders && dummyOrders.length > 0) {
    console.log(`✓ Found ${dummyOrders.length} test orders`);
    for (const ord of dummyOrders) {
      report.orders.push({
        id: ord.id,
        customer_name: ord.customer_name || 'N/A',
        reason: `Test email: ${ord.customer_email}`,
      });
    }
  }

  // Check order_products yang linked ke dummy data
  console.log('\n📊 Checking order_products linked to dummy data...');
  if (report.products.length > 0 || report.orders.length > 0) {
    const productIds = report.products.map(p => p.id);
    const orderIds = report.orders.map(o => o.id);

    let query = supabase.from('order_products').select('count', { count: 'exact' });
    
    if (productIds.length > 0) {
      query = query.in('product_id', productIds);
    }
    if (orderIds.length > 0) {
      query = query.in('order_id', orderIds);
    }

    const { count, error: opErr } = await query;
    if (!opErr && count) {
      report.orderProducts = count;
      console.log(`✓ Found ${count} order_products linked to dummy data`);
    }
  }

  return report;
}

async function main() {
  try {
    const report = await identifyDummyData();

    console.log('\n' + '='.repeat(60));
    console.log('📊 DUMMY DATA REPORT');
    console.log('='.repeat(60));

    if (report.products.length === 0 && report.tickets.length === 0 && report.orders.length === 0) {
      console.log('\n✅ Tidak ada dummy data ditemukan!');
    } else {
      if (report.products.length > 0) {
        console.log(`\n❌ Dummy Products (${report.products.length}):`);
        report.products.forEach(p => console.log(`   - ${p.name} (ID: ${p.id}) - Reason: ${p.reason}`));
      }

      if (report.tickets.length > 0) {
        console.log(`\n❌ Dummy Tickets (${report.tickets.length}):`);
        report.tickets.forEach(t => console.log(`   - ${t.name} (ID: ${t.id}) - Reason: ${t.reason}`));
      }

      if (report.orders.length > 0) {
        console.log(`\n❌ Test Orders (${report.orders.length}):`);
        report.orders.forEach(o => console.log(`   - ${o.customer_name} (ID: ${o.id}) - ${o.reason}`));
      }

      if (report.orderProducts > 0) {
        console.log(`\n⚠️  ${report.orderProducts} order_products linked ke dummy data`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔑 Next steps:');
    console.log('1. Review laporan di atas');
    console.log('2. Run: npm run identify:production-data');
    console.log('3. Run: npm run cleanup:dummy-data');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

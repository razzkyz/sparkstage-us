import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function auditRevenue() {
  try {
    // Tickets
    const ticketResult = await supabase
      .from('purchased_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'used')
      .gte('created_at', '2026-05-01T00:00:00Z')
      .lte('created_at', '2026-05-25T23:59:59Z');

    const ticketCount = ticketResult.count || 0;
    const ticketRevenue = ticketCount * 85000;

    console.log('TICKETS:', ticketCount, 'x 85000 =', ticketRevenue);

    // Products
    const productResult = await supabase
      .from('order_products')
      .select('total')
      .eq('payment_status', 'paid')
      .eq('pickup_status', 'completed')
      .gte('paid_at', '2026-05-01T00:00:00Z')
      .lte('paid_at', '2026-05-25T23:59:59Z');

    const productRevenue = (productResult.data || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const productCount = productResult.data?.length || 0;

    console.log('PRODUCTS:', productCount, 'orders = Rp', productRevenue);

    // Prints
    const printResult = await supabase
      .from('print_orders')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', '2026-05-01T00:00:00Z')
      .lte('paid_at', '2026-05-25T23:59:59Z');

    const printRevenue = (printResult.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const printCount = printResult.data?.length || 0;

    console.log('PRINTS:', printCount, 'orders = Rp', printRevenue);

    const total = ticketRevenue + productRevenue + printRevenue;
    console.log('\n=== SUMMARY ===');
    console.log('Tiket:', ticketRevenue.toLocaleString('id-ID'));
    console.log('Produk:', productRevenue.toLocaleString('id-ID'));
    console.log('Cetak:', printRevenue.toLocaleString('id-ID'));
    console.log('TOTAL:', total.toLocaleString('id-ID'));
    console.log('DOKU Target:', 'Rp 121.403.181');
    console.log('Gap:', (121403181 - total).toLocaleString('id-ID'));
  } catch (error) {
    console.error('Error:', error);
  }
}

auditRevenue();

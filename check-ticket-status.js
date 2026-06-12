import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ljnnhfkixogqtviqezmz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqbm5oZmtpeG9ncXR2aXFlemt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzI0OTc5MjEsImV4cCI6MTk4ODA3MzkyMX0.qPWGQdgvE2PbXqaFJ6E_K6L9hVZmP8B0pCQYMQSb9mE'
);

async function checkTicketStatus() {
  console.log('\n=== Ticket Status Distribution ===\n');
  
  // Get all data
  const { data, error } = await supabase
    .from('purchased_tickets')
    .select('id, status')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  const statusCount = {};
  data.forEach(t => {
    if (!statusCount[t.status]) statusCount[t.status] = 0;
    statusCount[t.status]++;
  });
  
  console.log('Status distribution:');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  console.log(`\nTotal: ${data.length}`);
  
  // Check specific date range: 1-23 May
  const { data: mayData, error: mayError } = await supabase
    .from('purchased_tickets')
    .select('id, status, created_at')
    .gte('created_at', '2026-05-01T00:00:00')
    .lte('created_at', '2026-05-23T23:59:59')
    .order('created_at', { ascending: false });
  
  if (mayError) {
    console.error('Error:', mayError);
    process.exit(1);
  }
  
  const mayStatusCount = {};
  mayData.forEach(t => {
    if (!mayStatusCount[t.status]) mayStatusCount[t.status] = 0;
    mayStatusCount[t.status]++;
  });
  
  console.log('\n=== May 1-23 Status Distribution ===\n');
  console.log('Status distribution:');
  Object.entries(mayStatusCount).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  console.log(`\nTotal: ${mayData.length}`);
  console.log(`\nRevenue if all paid: ${mayData.length} × 85,000 = Rp ${mayData.length * 85_000}`);
}

checkTicketStatus().catch(console.error);

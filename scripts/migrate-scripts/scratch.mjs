import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hogzjapnkvsihvvbgcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzkyNTYsImV4cCI6MjA4Mzg1NTI1Nn0.R5aWWG8FY9lNlIh3FCKFWaz0zYkm78KyrbO_CA2Grlc'
);

// Check current sold_capacity for the session the user is reporting (sesi 3 = 15:00)
async function checkCapacity() {
  // First see actual purchased_tickets for a specific date to understand what's happening
  const { data: tickets } = await supabase
    .from('purchased_tickets')
    .select('id, ticket_id, valid_date, time_slot, status')
    .eq('status', 'active')
    .order('valid_date')
    .limit(20);

  console.log('\n=== ACTIVE PURCHASED TICKETS (sample) ===');
  tickets?.forEach(t => console.log(`  ID:${t.id} ticket_id:${t.ticket_id} date:${t.valid_date} slot:${t.time_slot} status:${t.status}`));

  // Check sold_capacity vs actual ticket count per slot
  const { data: avails } = await supabase
    .from('ticket_availabilities')
    .select('ticket_id, date, time_slot, total_capacity, sold_capacity')
    .order('date')
    .limit(20);

  console.log('\n=== TICKET_AVAILABILITIES (sold_capacity) ===');
  avails?.forEach(a => console.log(`  ticket:${a.ticket_id} date:${a.date} slot:${a.time_slot} total:${a.total_capacity} sold:${a.sold_capacity}`));

  // Now count actual active tickets per slot to verify
  console.log('\n=== ACTUAL COUNT (from purchased_tickets) ===');
  const ticketIds = [...new Set(avails?.map(a => a.ticket_id) ?? [])];
  const { data: allActive } = await supabase
    .from('purchased_tickets')
    .select('ticket_id, valid_date, time_slot, status')
    .in('status', ['active', 'used'])
    .in('ticket_id', ticketIds);

  const counts = {};
  allActive?.forEach(t => {
    const slot = t.time_slot ? t.time_slot.slice(0,5) : 'null';
    const key = `${t.ticket_id}|${t.valid_date}|${slot}`;
    counts[key] = (counts[key] ?? 0) + 1;
  });
  Object.entries(counts).forEach(([k, v]) => {
    console.log(`  ${k} => actual_count: ${v}`);
  });
}

checkCapacity().catch(console.error);

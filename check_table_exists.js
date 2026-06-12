import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3OTI1NiwiZXhwIjoyMDgzODU1MjU2fQ.DJTJJHSGr7nQ_7D6fhjU-FnvQaUk0IpKpqp2aQ1p0Rs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
  try {
    // Try raw SQL to check if table exists
    const { data, error } = await supabase.rpc('check_table_exists', { 
      table_name: 'whatsapp_messages' 
    });
    
    if (error) {
      console.log('RPC error (expected):', error.message);
    }
    
    // Try to query from information_schema instead
    const { data: tables, error: err } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (err) {
      console.log('Schema query error:', err);
      console.log('\nTrying direct table select...');
      
      // Try direct select with no filter
      const { data: test, error: testErr } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .limit(1);
      
      if (testErr) {
        console.log('Direct select error:', testErr);
      } else {
        console.log('Success! Table exists, records:', test);
      }
    } else {
      console.log('Tables in public schema:');
      const tableNames = tables.map(t => t.table_name);
      if (tableNames.includes('whatsapp_messages')) {
        console.log('✓ whatsapp_messages table EXISTS');
      } else {
        console.log('✗ whatsapp_messages table NOT FOUND');
        console.log('Available tables:', tableNames.filter(t => t.includes('whatsapp')));
      }
    }
    
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

checkTable();

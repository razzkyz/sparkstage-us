import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
// Use service_role key (backend key) to bypass RLS
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3OTI1NiwiZXhwIjoyMDgzODU1MjU2fQ.DJTJJHSGr7nQ_7D6fhjU-FnvQaUk0IpKpqp2aQ1p0Rs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function queryTable() {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('order_number', 'SPK-1778646332252-RI7TC');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Found WhatsApp message:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('No whatsapp_messages found for order SPK-1778646332252-RI7TC');
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

queryTable();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzkyNTYsImV4cCI6MjA4Mzg1NTI1Nn0.R5aWWG8FY9lNlIh3FCKFWaz0zYkm78KyrbO_CA2Grlc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function queryWhatsAppMessage() {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('order_id', 'SPK-1778646332252-RI7TC')
      .single();
    
    if (error) {
      console.error('Error querying database:', error);
      return;
    }
    
    console.log('WhatsApp Message Record Found:');
    console.log(JSON.stringify(data, null, 2));
    
    // Validate the details
    if (data) {
      console.log('\n--- Verification ---');
      console.log('Order ID:', data.order_id);
      console.log('Customer Phone:', data.customer_phone);
      console.log('Customer Name:', data.customer_name);
      console.log('Delivery Status:', data.delivery_status);
      console.log('Error Message:', data.error_message || 'None');
      console.log('Doku Message ID:', data.doku_message_id);
      console.log('Sent At:', data.sent_at);
      console.log('Created At:', data.created_at);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

queryWhatsAppMessage();

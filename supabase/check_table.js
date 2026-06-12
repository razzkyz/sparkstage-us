import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzkyNTYsImV4cCI6MjA4Mzg1NTI1Nn0.R5aWWG8FY9lNlIh3FCKFWaz0zYkm78KyrbO_CA2Grlc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function queryTable() {
  try {
    // Get first few records to see structure
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('Error querying database:', error);
      return;
    }
    
    console.log('Sample records from whatsapp_messages table:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

queryTable();

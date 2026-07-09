import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './supabase/functions/.env' }); // or whichever env has anon key

// The URL and Anon Key are usually in frontend/.env
import * as fs from 'fs';
const envFile = fs.readFileSync('./frontend/.env', 'utf-8');
const matchUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const matchKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!matchUrl || !matchKey) {
  console.log("Could not find supabase url/key");
  process.exit(1);
}

const supabase = createClient(matchUrl[1].trim(), matchKey[1].trim());

async function run() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      order_items (
        id,
        purchased_tickets (
          id,
          ticket_code
        )
      )
    `)
    .limit(1);
    
  console.log("Error:", error);
  console.log("Data:", data);
}

run();

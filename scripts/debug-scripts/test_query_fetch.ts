import * as fs from 'fs';

const envFile = fs.readFileSync('./frontend/.env', 'utf-8');
const matchUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const matchKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!matchUrl || !matchKey) {
  console.log("Could not find supabase url/key");
  process.exit(1);
}

const url = matchUrl[1].trim();
const key = matchKey[1].trim();

async function run() {
  const queryUrl = `${url}/rest/v1/orders?select=id,order_number,status,total,created_at,expires_at,order_items(id,ticket_id,ticket_name,selected_date,selected_time_slots,quantity,unit_price,subtotal,purchased_tickets(id,ticket_code,status,queue_number,queue_overflow))&user_id=eq.b7d666ac-74f1-4c96-acea-825085a5e2b6&order=created_at.desc&limit=1`;
  
  const res = await fetch(queryUrl, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

run();

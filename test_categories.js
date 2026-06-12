import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
const envFile = fs.readFileSync('./frontend/.env', 'utf-8');
const matchUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const matchKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(matchUrl[1].trim(), matchKey[1].trim());
async function run() {
  const { data, error } = await supabase.from('dressing_room_categories').select('*');
  console.log("Categories:", data);
  if (error) console.error("Error:", error);
}
run();

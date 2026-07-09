import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('user_role_assignments').select('user_id, role_name');
  if (error) {
    console.error(error);
    return;
  }
  fs.writeFileSync('roles.json', JSON.stringify(data, null, 2));
}
test();

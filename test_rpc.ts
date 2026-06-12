import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually since dotenv.config() might not find it
const envConfig = dotenv.parse(readFileSync(resolve(process.cwd(), 'frontend/.env.local')));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpc() {
  const { data, error } = await supabase.rpc('hide_user_order', {
    p_order_number: 'TEST_ORDER'
  });
  console.log('RPC result:', { data, error });
}

checkRpc();

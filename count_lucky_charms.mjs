import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const envLocalPath = './.env.local';
if (fs.existsSync(envLocalPath)) {
  const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));
  Object.assign(process.env, envLocal);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function countLuckyCharms() {
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', 'lucky-charm')
    .single();
    
  if (catError || !catData) {
    console.error("Could not find lucky-charm category:", catError);
    return;
  }
  
  const luckyCharmId = catData.id;
  
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', luckyCharmId)
    .is('deleted_at', null);
    
  if (error) {
    console.error("Error fetching count:", error);
    return;
  }
  
  console.log(`TOTAL_IN_LUCKY_CHARM=${count}`);
}

countLuckyCharms();

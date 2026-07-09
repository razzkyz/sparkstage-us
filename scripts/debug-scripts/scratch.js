import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('products').select('name, category_id').ilike('name', '%Speckles%');
  console.log('Products:', data);
  if (data && data.length > 0) {
    const { data: cats } = await supabase.from('categories').select('id, slug').in('id', data.map(d => d.category_id));
    console.log('Categories:', cats);
  }
}
run();

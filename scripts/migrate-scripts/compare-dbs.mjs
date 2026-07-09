import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// --- US DB ---
dotenv.config();
const envLocal = fs.existsSync('./.env.local') ? dotenv.parse(fs.readFileSync('./.env.local')) : {};
Object.assign(process.env, envLocal);

const supabaseUS = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// --- Indo DB (from sparkstage project .env.local) ---
const indoEnvPath = 'C:/SparkDoku/sparkstage/.env.local';
const indoEnv = fs.existsSync(indoEnvPath) ? dotenv.parse(fs.readFileSync(indoEnvPath)) : {};
const supabaseIndo = indoEnv.VITE_SUPABASE_URL ? createClient(
  indoEnv.VITE_SUPABASE_URL,
  indoEnv.SUPABASE_SERVICE_ROLE_KEY || indoEnv.VITE_SUPABASE_ANON_KEY
) : null;

async function compareDBs() {
  console.log("=== US Database ===");
  const { count: usCount } = await supabaseUS.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null);
  const { count: usWithImg } = await supabaseUS.from('product_images').select('*', { count: 'exact', head: true });
  const { count: usWithVariants } = await supabaseUS.from('product_variants').select('*', { count: 'exact', head: true });
  
  console.log(`  Products:    ${usCount}`);
  console.log(`  Images:      ${usWithImg}`);
  console.log(`  Variants:    ${usWithVariants}`);

  if (supabaseIndo) {
    console.log("\n=== Indo Database ===");
    const { count: indoCount } = await supabaseIndo.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null);
    const { count: indoWithImg } = await supabaseIndo.from('product_images').select('*', { count: 'exact', head: true });
    const { count: indoWithVariants } = await supabaseIndo.from('product_variants').select('*', { count: 'exact', head: true });
    
    console.log(`  Products:    ${indoCount}`);
    console.log(`  Images:      ${indoWithImg}`);
    console.log(`  Variants:    ${indoWithVariants}`);

    console.log(`\n=== DIFFERENCE ===`);
    console.log(`  Missing products in US: ${indoCount - usCount}`);
  } else {
    console.log("\nCould not connect to Indo DB (env not found at " + indoEnvPath + ")");
  }
}

compareDBs().catch(console.error);

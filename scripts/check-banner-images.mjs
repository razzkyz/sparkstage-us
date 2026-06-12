#!/usr/bin/env node
/**
 * Check which tables use ImageKit banner/public images
 * to determine scope of migration
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODU0NzA4MSwiZXhwIjoyMDQ0MTIzMDgxfQ.NvSPnB_cq4ypK-Iw6kzAJTN0AhSFhOHqKlvpINgGxr4';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔍 Checking banner and public asset URLs in database...\n');

  try {
    // 1. Check banners table
    console.log('1️⃣ Checking banners table...');
    const { data: banners, error: bannersError } = await supabase
      .from('banners')
      .select('id, image_url, title_image_url')
      .or('image_url.like.%imagekit.io%,title_image_url.like.%imagekit.io%');
    
    if (bannersError) throw bannersError;
    
    console.log(`   Found: ${banners?.length || 0} banners using ImageKit`);
    if (banners && banners.length > 0) {
      console.log('   Sample URLs:');
      banners.slice(0, 3).forEach(b => {
        if (b.image_url?.includes('imagekit')) {
          console.log(`     - ${b.image_url}`);
        }
        if (b.title_image_url?.includes('imagekit')) {
          console.log(`     - ${b.title_image_url}`);
        }
      });
    }

    // 2. Check beauty_posters table
    console.log('\n2️⃣ Checking beauty_posters table...');
    const { data: beautyPosters, error: postersError } = await supabase
      .from('beauty_posters')
      .select('id, image_url')
      .like('image_url', '%imagekit.io%');
    
    if (postersError) throw postersError;
    
    console.log(`   Found: ${beautyPosters?.length || 0} beauty posters using ImageKit`);
    if (beautyPosters && beautyPosters.length > 0) {
      console.log('   Sample URLs:');
      beautyPosters.slice(0, 3).forEach(p => {
        console.log(`     - ${p.image_url}`);
      });
    }

    // 3. Check glam_page_settings table
    console.log('\n3️⃣ Checking glam_page_settings table...');
    const { data: glamPages, error: glamError } = await supabase
      .from('glam_page_settings')
      .select('id, hero_image_url, look_model_image_url, look_star_links');
    
    if (glamError) throw glamError;
    
    // Filter in JS since PostgREST doesn't support complex OR with JSONB
    const glamPagesFiltered = glamPages?.filter(g => 
      g.hero_image_url?.includes('imagekit') ||
      g.look_model_image_url?.includes('imagekit') ||
      JSON.stringify(g.look_star_links || {}).includes('imagekit')
    ) || [];
    
    console.log(`   Found: ${glamPagesFiltered.length} glam pages using ImageKit`);
    if (glamPagesFiltered.length > 0) {
      console.log('   Sample URLs:');
      glamPagesFiltered.slice(0, 1).forEach(g => {
        if (g.hero_image_url?.includes('imagekit')) {
          console.log(`     - hero: ${g.hero_image_url}`);
        }
        if (g.look_model_image_url?.includes('imagekit')) {
          console.log(`     - model: ${g.look_model_image_url}`);
        }
      });
    }

    // 4. Check dressing_room_look_photos table
    console.log('\n4️⃣ Checking dressing_room_look_photos table...');
    const { data: dressingRoom, error: dressingError } = await supabase
      .from('dressing_room_look_photos')
      .select('id, image_url')
      .like('image_url', '%imagekit.io%');
    
    if (dressingError) throw dressingError;
    
    console.log(`   Found: ${dressingRoom?.length || 0} dressing room photos using ImageKit`);
    if (dressingRoom && dressingRoom.length > 0) {
      console.log('   Sample URLs:');
      dressingRoom.slice(0, 3).forEach(d => {
        console.log(`     - ${d.image_url}`);
      });
    }

    // Summary
    const bannersCount = banners?.length || 0;
    const postersCount = beautyPosters?.length || 0;
    const glamCount = glamPagesFiltered.length;
    const dressingCount = dressingRoom?.length || 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY - ImageKit Public Assets in Database');
    console.log('='.repeat(80));
    console.log(`Banners:              ${bannersCount} records`);
    console.log(`Beauty Posters:       ${postersCount} records`);
    console.log(`Glam Page Settings:   ${glamCount} records`);
    console.log(`Dressing Room Photos: ${dressingCount} records`);
    console.log(`TOTAL:                ${bannersCount + postersCount + glamCount + dressingCount} records`);
    console.log('='.repeat(80));

    // Check folder structure
    console.log('\n🗂️ ImageKit Folder Structure Used:');
    const allUrls = [
      ...(banners || []).map(b => b.image_url),
      ...(banners || []).map(b => b.title_image_url),
      ...(beautyPosters || []).map(p => p.image_url),
      ...glamPagesFiltered.map(g => g.hero_image_url),
      ...glamPagesFiltered.map(g => g.look_model_image_url),
      ...(dressingRoom || []).map(d => d.image_url),
    ].filter(Boolean).filter(u => u.includes('imagekit'));

    const folders = new Set();
    allUrls.forEach(url => {
      const match = url.match(/imagekit\.io\/hjnuyz1t3\/([^\/]+)/);
      if (match) {
        folders.add(match[1]);
      }
    });

    folders.forEach(folder => {
      console.log(`   /${folder}/`);
    });

    // Check if /public/ folder is used
    const publicFolderCount = allUrls.filter(u => u.includes('/public/')).length;
    console.log(`\n📁 URLs using /public/ folder: ${publicFolderCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

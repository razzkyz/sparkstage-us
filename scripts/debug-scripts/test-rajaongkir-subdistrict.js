// Test script for RajaOngkir District API
// Usage: node test-rajaongkir-subdistrict.js

const API_KEY = 'v3sHTJuq2e6671c7d9d93690TOI7N03G'; // From .env
const CITY_ID = '68'; // BANDUNG BARAT - use a test city ID

async function testDistrict() {
  console.log('Testing RajaOngkir District API...\n');
  console.log(`City ID: ${CITY_ID}`);
  
  // Try the correct endpoint from official docs
  const endpoints = [
    // Official Komerce endpoint - should work!
    { url: `https://rajaongkir.komerce.id/api/v1/destination/district/${CITY_ID}`, name: 'Komerce District' },
    { url: `https://rajaongkir.komerce.id/api/v1/destination/district`, name: 'Komerce District All' },
  ];

  for (const endpoint of endpoints) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing ${endpoint.name}: ${endpoint.url}`);
    console.log('='.repeat(80));
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'key': API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('\nResponse structure:');
        console.log(JSON.stringify(data, null, 2).substring(0, 1000));
        
        if (response.ok && data?.data?.length > 0) {
          console.log(`\n✅ SUCCESS! Found ${data.data.length} districts`);
          console.log('\nSample district:');
          console.log(JSON.stringify(data.data[0], null, 2));
          console.log('\n🎉 This endpoint works! Update your Edge Function to use "district"');
          return true;
        }
      } else {
        const text = await response.text();
        console.log('\nResponse (non-JSON):');
        console.log(text.substring(0, 500));
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  return false;
}

testDistrict().then(success => {
  if (!success) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ Could not fetch districts. Please check:');
    console.log('1. API Key is valid and has Enterprise access');
    console.log('2. City ID format is correct');
    console.log('3. Endpoint URL matches documentation');
    console.log('='.repeat(80));
  }
});

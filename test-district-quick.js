// Quick test for multiple cities
const API_KEY = 'v3sHTJuq2e6671c7d9d93690TOI7N03G';

const testCities = [
  { id: '153', name: 'Jakarta Selatan' },
  { id: '155', name: 'Jakarta Barat' },
  { id: '22', name: 'Bandung' },
  { id: '68', name: 'Bandung Barat' },
];

async function testCity(cityId, cityName) {
  const url = `https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const count = data?.data?.length || 0;
      console.log(`✅ ${cityName} (${cityId}): ${count} districts`);
      if (count > 0) {
        console.log(`   Sample: ${data.data[0].name}`);
      }
    } else {
      console.log(`❌ ${cityName} (${cityId}): ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ ${cityName} (${cityId}): ${error.message}`);
  }
}

async function testAll() {
  console.log('Testing RajaOngkir District Endpoint for Multiple Cities\n');
  console.log('='.repeat(60));
  
  for (const city of testCities) {
    await testCity(city.id, city.name);
  }
  
  console.log('='.repeat(60));
  console.log('\n✅ All tests completed!\n');
  console.log('Next: Test in your app by:');
  console.log('1. Go to Profile page');
  console.log('2. Select Province (e.g., DKI Jakarta)');
  console.log('3. Select City (e.g., Jakarta Selatan)');
  console.log('4. Watch District dropdown populate automatically!');
}

testAll();

#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testLocationAPI() {
  console.log('\n🧪 TESTING LOCATION API ENDPOINT\n');
  console.log('='.repeat(70));
  
  const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  // Test data
  const testLocation = {
    name: `API Test Location ${Date.now()}`,
    address_line1: '123 Test Street',
    address_line2: 'Suite 100',
    city: 'Test City',
    state: 'OH',
    postal_code: '44114',
    country: 'US',
    contact_name: 'John Doe',
    contact_phone: '555-1234',
    contact_email: 'john@test.com',
    is_one_time: false,
    notes: 'This is a test location created via API'
  };

  console.log('\n1️⃣  Sending POST request to /api/locations...\n');
  console.log('   Request data:', JSON.stringify(testLocation, null, 2));
  console.log('\n   NOTE: This will fail with 401 because we don\'t have a session cookie');
  console.log('   But we can see if the endpoint is reachable\n');

  try {
    const response = await fetch(`${apiUrl}/api/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLocation),
    });

    console.log('   Response status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('   Response body:', JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('\n✅ Expected 401 Unauthorized (no session)');
      console.log('   This means the API endpoint IS reachable');
      console.log('   The issue must be in the authenticated flow');
    } else if (response.status === 201 || response.status === 200) {
      console.log('\n✅ Location created successfully!');
      console.log('   Location ID:', data.id);
      console.log('   This means the endpoint is working!');
    } else {
      console.log('\n❌ Unexpected response status');
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Next.js server is not running!');
      console.error('   Start it with: npm run dev');
    }
  }

  console.log('\n' + '='.repeat(70));
  
  // Now let's check the LocationSelector code to see what happens after save
  console.log('\n2️⃣  ANALYZING LOCATION SELECTOR CODE...\n');
  
  console.log('   In LocationSelector.tsx lines 54-77:');
  console.log('   ├─ handleSaveLocation calls fetch(\'/api/locations\', POST)');
  console.log('   ├─ If response.ok: adds to local state, calls onLocationChange');
  console.log('   ├─ If not ok: throws error');
  console.log('   └─ onLocationChange should trigger UI update');
  
  console.log('\n   In LocationForm.tsx lines 99-120:');
  console.log('   ├─ handleSubmit calls onSave(formData)');
  console.log('   ├─ onSave is handleSaveLocation from parent');
  console.log('   ├─ If succeeds: closes modal');
  console.log('   └─ If fails: shows alert with error');
  
  console.log('\n3️⃣  HYPOTHESIS - What might be happening:\n');
  console.log('   A) API returns 500 even though data saves (RLS issue)');
  console.log('   B) API succeeds but response is malformed');
  console.log('   C) Frontend error handler swallows success');
  console.log('   D) State update doesn\'t trigger re-render');
  
  console.log('\n4️⃣  RECOMMENDED INVESTIGATION:\n');
  console.log('   □ Check browser Network tab when creating location');
  console.log('   □ Check POST /api/locations response status and body');
  console.log('   □ Check browser Console for JavaScript errors');
  console.log('   □ Check Vercel logs for server-side errors');
  console.log('   □ Add console.log in LocationForm handleSubmit');
  console.log('   □ Add console.log in LocationSelector handleSaveLocation');
  
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 NEXT STEP: Let\'s check if RLS is blocking the SELECT\n');
}

testLocationAPI().catch(error => {
  console.error('\n💥 FATAL ERROR:', error.message);
  process.exit(1);
});


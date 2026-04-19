const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAdminEndpoints() {
  console.log('🧪 Testing Admin Endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log('');

    // Test admin login
    console.log('2. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@instaserve.com',
      password: 'admin123'
    });
    console.log('✅ Admin login successful');
    const token = loginResponse.data.token;
    console.log('');

    // Test getting provider services
    console.log('3. Testing get provider services...');
    const servicesResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Get provider services:', servicesResponse.data.services?.length || 0, 'services found');
    console.log('');

    // Test approve endpoint (this should work now if server is running)
    if (servicesResponse.data.services && servicesResponse.data.services.length > 0) {
      const testServiceId = servicesResponse.data.services[0]._id;
      console.log(`4. Testing approve endpoint with service ID: ${testServiceId}...`);
      
      try {
        const approveResponse = await axios.post(
          `${BASE_URL}/api/admin/provider-services/${testServiceId}/approve`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('✅ Approve endpoint working:', approveResponse.data);
      } catch (approveError) {
        console.log('❌ Approve endpoint error:', approveError.response?.data || approveError.message);
      }
    } else {
      console.log('⚠️ No services found to test approve endpoint');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 SOLUTION: Start the server first!');
      console.log('   cd server');
      console.log('   npm start');
    }
  }
}

// Run the test
testAdminEndpoints();

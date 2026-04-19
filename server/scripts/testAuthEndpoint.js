const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAuthEndpoint() {
  console.log('🔐 Testing authentication endpoint directly...\n');

  try {
    // Test 1: Check if endpoint exists
    console.log('1. 🌐 Testing endpoint health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not accessible');
      return;
    }

    // Test 2: Try login with detailed logging
    console.log('\n2. 🔐 Testing Sahil login with detailed logging...');
    
    const loginData = {
      email: 'sahil123@gmail.com',
      password: 'password123'
    };
    
    console.log('   Login data:', JSON.stringify(loginData, null, 2));
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, loginData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Login successful!');
      console.log('   Response status:', response.status);
      console.log('   Response data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ Login failed with detailed error:');
      console.log('   Error message:', error.message);
      console.log('   Response status:', error.response?.status);
      console.log('   Response data:', error.response?.data);
      console.log('   Request data:', JSON.stringify(error.config?.data, null, 2));
      console.log('   Request headers:', JSON.stringify(error.config?.headers, null, 2));
    }

    // Test 3: Try customer login to compare
    console.log('\n3. 👤 Testing customer login for comparison...');
    try {
      const customerResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'customer@example.com',
        password: 'password123'
      });
      
      console.log('✅ Customer login works!');
      console.log('   Response status:', customerResponse.status);
      
    } catch (error) {
      console.log('❌ Customer login also failed:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuthEndpoint().then(() => {
  console.log('\n🎯 Auth endpoint test completed!');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});

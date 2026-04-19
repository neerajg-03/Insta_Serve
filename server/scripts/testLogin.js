const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testLogin() {
  console.log('🔐 Testing login credentials...\n');

  try {
    // Test customer login
    console.log('1. 👤 Testing customer login...');
    try {
      const customerResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'customer@example.com',
        password: 'password123'
      });
      console.log('✅ Customer login successful');
      console.log(`   Token: ${customerResponse.data.token.substring(0, 20)}...`);
    } catch (error) {
      console.log('❌ Customer login failed:', error.response?.data?.message);
    }

    // Test Sahil login
    console.log('\n2. 👨‍🔧 Testing Sahil login...');
    try {
      const sahilResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'sahil123@gmail.com',
        password: 'password123'
      });
      console.log('✅ Sahil login successful');
      console.log(`   Token: ${sahilResponse.data.token.substring(0, 20)}...`);
      console.log(`   User: ${sahilResponse.data.user.name} (${sahilResponse.data.user.role})`);
    } catch (error) {
      console.log('❌ Sahil login failed:', error.response?.data?.message);
    }

    // Test admin login
    console.log('\n3. 👑 Testing admin login...');
    try {
      const adminResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@instaserve.com',
        password: 'admin123'
      });
      console.log('✅ Admin login successful');
      console.log(`   Token: ${adminResponse.data.token.substring(0, 20)}...`);
      console.log(`   User: ${adminResponse.data.user.name} (${adminResponse.data.user.role})`);
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLogin().then(() => {
  console.log('\n🎯 Login test completed!');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testPendingApproval() {
  console.log('🧪 Testing approval of a PENDING service...\n');

  try {
    // Login as admin
    console.log('1. 🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@instaserve.com',
      password: 'admin123'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Get all services and find a pending one
    console.log('2. 📋 Finding pending services...');
    const servicesResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const allServices = servicesResponse.data.services || [];
    const pendingServices = allServices.filter(s => !s.isApproved);
    
    console.log(`✅ Found ${pendingServices.length} pending services\n`);

    if (pendingServices.length === 0) {
      console.log('⚠️ No pending services available for testing');
      console.log('💡 All services are already approved');
      return;
    }

    // Test the first pending service
    const testService = pendingServices[0];
    console.log(`3. 🎯 Testing approval of: ${testService.title}`);
    console.log(`   ID: ${testService._id}`);
    console.log(`   Current Status: ${testService.isApproved ? 'Approved' : 'Pending'}\n`);

    // Try to approve it
    console.log('4. ✅ Sending approval request...');
    const approvalResponse = await axios.post(
      `${BASE_URL}/api/admin/provider-services/${testService._id}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('✅ Approval successful!');
    console.log('📄 Response:', JSON.stringify(approvalResponse.data, null, 2));
    console.log('');

    // Verify the approval
    console.log('5. 🔍 Verifying approval...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const updatedService = verifyResponse.data.services?.find(s => s._id === testService._id);
    if (updatedService && updatedService.isApproved) {
      console.log('🎉 SUCCESS: Service is now approved!');
      console.log(`📅 Approved at: ${new Date(updatedService.updatedAt).toLocaleString()}`);
    } else {
      console.log('❌ Verification failed');
    }

    console.log('\n6. 📊 Updated service summary:');
    const newPendingServices = verifyResponse.data.services.filter(s => !s.isApproved);
    const newApprovedServices = verifyResponse.data.services.filter(s => s.isApproved);
    
    console.log(`   ⏳ Pending: ${newPendingServices.length}`);
    console.log(`   ✅ Approved: ${newApprovedServices.length}`);
    console.log(`   📊 Total: ${verifyResponse.data.services.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Error:', error.response.data);
    }
  }
}

// Run the test
testPendingApproval().then(() => {
  console.log('\n🎯 Pending approval test completed!');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});

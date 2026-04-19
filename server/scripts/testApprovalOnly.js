const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testApprovalOnly() {
  console.log('🧪 Testing Provider Service Approval Only...\n');

  try {
    // Step 1: Login as admin
    console.log('1. 🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@instaserve.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.token) {
      throw new Error('Admin login failed');
    }
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful');
    console.log('');

    // Step 2: Get all services to find a test request
    console.log('2. 📋 Getting all services to find test requests...');
    const servicesResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const allServices = servicesResponse.data.services || [];
    console.log(`✅ Found ${allServices.length} total services`);
    
    // Find any service (approved or pending)
    const testService = allServices[0];
    if (!testService) {
      console.log('❌ No services found to test approval');
      console.log('💡 Try creating some provider service requests first');
      return;
    }

    console.log(`✅ Using test service: ${testService.title} (${testService._id})`);
    console.log(`📊 Current status: ${testService.isApproved ? 'Approved' : 'Pending'}`);
    console.log('');

    // Step 3: Test the approval endpoint
    console.log('3. 🎯 Testing approval endpoint...');
    console.log(`🔗 Endpoint: ${BASE_URL}/api/admin/provider-services/${testService._id}/approve`);
    
    try {
      const approvalResponse = await axios.post(
        `${BASE_URL}/api/admin/provider-services/${testService._id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      console.log('✅ Approval API call successful!');
      console.log('📄 Response:', JSON.stringify(approvalResponse.data, null, 2));
      console.log('');

      // Step 4: Verify the change
      console.log('4. 🔍 Verifying the approval...');
      const verifyResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const updatedService = verifyResponse.data.services?.find(s => s._id === testService._id);
      if (updatedService) {
        console.log(`✅ Service found after approval`);
        console.log(`📊 Status: ${updatedService.isApproved ? 'Approved' : 'Pending'}`);
        console.log(`📅 Updated: ${updatedService.updatedAt}`);
        
        if (updatedService.isApproved) {
          console.log('🎉 SUCCESS: Provider service approval is working!');
        } else {
          console.log('⚠️ Service still pending after approval call');
        }
      } else {
        console.log('❌ Service not found after approval');
      }

    } catch (approvalError) {
      console.error('❌ Approval failed:', approvalError.message);
      
      if (approvalError.response) {
        console.error('📊 Status:', approvalError.response.status);
        console.error('📄 Error:', approvalError.response.data);
        
        if (approvalError.response.status === 404) {
          console.log('');
          console.log('🔍 404 Error Analysis:');
          console.log('   1. Check if server is running on port 5000');
          console.log('   2. Verify admin routes are mounted correctly');
          console.log('   3. Check if endpoint path is correct');
          console.log('   4. Verify authentication token is valid');
        }
      }
    }

    console.log('');
    console.log('5. 🧪 Testing rejection endpoint as well...');
    
    try {
      const rejectResponse = await axios.post(
        `${BASE_URL}/api/admin/provider-services/${testService._id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      console.log('✅ Rejection API call successful!');
      console.log('📄 Response:', JSON.stringify(rejectResponse.data, null, 2));
      
    } catch (rejectError) {
      console.error('❌ Rejection failed:', rejectError.message);
      if (rejectError.response) {
        console.error('📊 Status:', rejectError.response.status);
        console.error('📄 Error:', rejectError.response.data);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 SOLUTION: Start the server first!');
      console.log('   cd "c:\\Users\\NEERAJ GUPTA\\Desktop\\Insta_Serve3.0"');
      console.log('   node server/index.js');
    } else if (error.response?.status === 401) {
      console.log('');
      console.log('🔐 SOLUTION: Check admin credentials');
      console.log('   Make sure admin@instaserve.com / admin123 exists');
    }
  }
}

// Run the test
testApprovalOnly().then(() => {
  console.log('\n🎯 Approval test completed!');
  console.log('📊 Check the results above to see if approval is working');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});

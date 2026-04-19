const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Service = require('../models/Service');

const BASE_URL = 'http://localhost:5000';

async function testProviderApproval() {
  console.log('🧪 Testing Provider Service Approval...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

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

    // Step 2: Create a test provider
    console.log('2. 👤 Creating test provider...');
    const providerData = {
      name: 'Test Provider',
      email: `provider${Date.now()}@test.com`,
      password: 'password123',
      phone: '1234567890',
      role: 'provider',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      }
    };

    const providerResponse = await axios.post(`${BASE_URL}/api/auth/register`, providerData);
    const testProvider = providerResponse.data.user;
    console.log('✅ Test provider created:', testProvider.email);
    console.log('');

    // Step 3: Create a test service request from provider
    console.log('3. 📋 Creating test service request...');
    const serviceRequestData = {
      title: 'Test Service Request',
      description: 'This is a test service request for approval',
      category: 'plumbing',
      price: 500,
      priceType: 'fixed',
      duration: { value: 2, unit: 'hours' },
      serviceArea: 'Test City',
      providerId: testProvider._id
    };

    const serviceResponse = await axios.post(
      `${BASE_URL}/api/services/provider/request`,
      serviceRequestData,
      { headers: { Authorization: `Bearer ${providerResponse.data.token}` } }
    );

    const serviceRequest = serviceResponse.data.providerService;
    console.log('✅ Service request created:', serviceRequest._id);
    console.log('📊 Status:', serviceRequest.isApproved ? 'Approved' : 'Pending');
    console.log('');

    // Step 4: Get all pending requests as admin
    console.log('4. 📋 Getting pending requests as admin...');
    const pendingResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const pendingRequests = pendingResponse.data.services?.filter(s => !s.isApproved) || [];
    console.log(`✅ Found ${pendingRequests.length} pending requests`);
    
    if (pendingRequests.length === 0) {
      console.log('⚠️ No pending requests found to test approval');
      return;
    }
    console.log('');

    // Step 5: Test approval of the first pending request
    const testRequestId = pendingRequests[0]._id;
    console.log(`5. ✅ Testing approval of request: ${testRequestId}`);
    
    try {
      const approvalResponse = await axios.post(
        `${BASE_URL}/api/admin/provider-services/${testRequestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      console.log('✅ Approval successful!');
      console.log('📄 Response:', approvalResponse.data);
      console.log('');

      // Step 6: Verify the approval
      console.log('6. 🔍 Verifying approval...');
      const verifyResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const approvedService = verifyResponse.data.services?.find(s => s._id === testRequestId);
      if (approvedService && approvedService.isApproved) {
        console.log('✅ Verification successful - service is now approved!');
        console.log('📅 Approved at:', approvedService.updatedAt);
      } else {
        console.log('❌ Verification failed - service not approved');
      }

    } catch (approvalError) {
      console.error('❌ Approval failed:', approvalError.response?.data || approvalError.message);
      
      if (approvalError.response?.status === 404) {
        console.log('🔍 404 Error - Possible causes:');
        console.log('   1. Server not running (check port 5000)');
        console.log('   2. Wrong endpoint path');
        console.log('   3. Database connection issue');
        console.log('   4. Authentication/authorization issue');
      }
    }

    console.log('');
    console.log('7. 🧹 Cleaning up test data...');
    
    // Clean up test data
    try {
      await axios.delete(`${BASE_URL}/api/admin/services/${testRequestId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      await axios.delete(`${BASE_URL}/api/admin/users/${testProvider._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup failed:', cleanupError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 SOLUTION: Start the server first!');
      console.log('   cd "c:\\Users\\NEERAJ GUPTA\\Desktop\\Insta_Serve3.0"');
      console.log('   node server/index.js');
    }
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the test
testProviderApproval().then(() => {
  console.log('\n🎉 Test completed!');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});

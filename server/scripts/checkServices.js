const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function checkServices() {
  console.log('🔍 Checking all services and their status...\n');

  try {
    // Login as admin
    console.log('1. 🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@instaserve.com',
      password: 'admin123'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Get all services
    console.log('2. 📋 Getting all services...');
    const servicesResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const allServices = servicesResponse.data.services || [];
    console.log(`✅ Found ${allServices.length} total services\n`);

    // Display each service with details
    console.log('3. 📊 Service Details:');
    console.log('='.repeat(80));
    
    allServices.forEach((service, index) => {
      console.log(`\n${index + 1}. 📋 ${service.title}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Status: ${service.isApproved ? '✅ Approved' : '⏳ Pending'}`);
      console.log(`   Provider: ${service.provider?.name || 'Unknown'}`);
      console.log(`   Category: ${service.category}`);
      console.log(`   Price: ₹${service.price}`);
      console.log(`   Created: ${new Date(service.createdAt).toLocaleDateString()}`);
      
      if (service.isApproved) {
        console.log(`   Approved: ${new Date(service.updatedAt).toLocaleDateString()}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    
    // Count pending services
    const pendingServices = allServices.filter(s => !s.isApproved);
    const approvedServices = allServices.filter(s => s.isApproved);
    
    console.log(`\n📈 Summary:`);
    console.log(`   ⏳ Pending: ${pendingServices.length}`);
    console.log(`   ✅ Approved: ${approvedServices.length}`);
    console.log(`   📊 Total: ${allServices.length}`);

    if (pendingServices.length > 0) {
      console.log(`\n🎯 Available for Approval:`);
      pendingServices.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.title} (ID: ${service._id})`);
      });
    } else {
      console.log(`\n⚠️ No pending services available for approval`);
      console.log(`💡 Try creating a new provider service request first`);
    }

  } catch (error) {
    console.error('❌ Error checking services:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Error:', error.response.data);
    }
  }
}

// Run the check
checkServices().then(() => {
  console.log('\n🎯 Service check completed!');
}).catch(error => {
  console.error('\n💥 Check failed:', error);
});

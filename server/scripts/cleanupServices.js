const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function cleanupServices() {
  console.log('🧹 Cleaning up all services...\n');

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
    console.log(`✅ Found ${allServices.length} services\n`);

    if (allServices.length === 0) {
      console.log('✅ No services to clean up');
      return;
    }

    // Delete all services
    console.log('3. 🗑️ Deleting all services...');
    let deletedCount = 0;
    let errorCount = 0;

    for (const service of allServices) {
      try {
        await axios.delete(`${BASE_URL}/api/admin/services/${service._id}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        console.log(`   ✅ Deleted: ${service.title}`);
        deletedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to delete: ${service.title} (${error.message})`);
        errorCount++;
      }
    }

    console.log(`\n4. 📊 Cleanup Summary:`);
    console.log(`   ✅ Successfully deleted: ${deletedCount}`);
    console.log(`   ❌ Failed to delete: ${errorCount}`);
    console.log(`   📊 Total processed: ${allServices.length}`);

    // Verify cleanup
    console.log('\n5. 🔍 Verifying cleanup...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const remainingServices = verifyResponse.data.services || [];
    console.log(`   📊 Remaining services: ${remainingServices.length}`);

    if (remainingServices.length === 0) {
      console.log('   🎉 SUCCESS: All services cleaned up!');
    } else {
      console.log('   ⚠️ Some services still remain');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Error:', error.response.data);
    }
  }
}

// Run the cleanup
cleanupServices().then(() => {
  console.log('\n🎯 Service cleanup completed!');
}).catch(error => {
  console.error('\n💥 Cleanup crashed:', error);
});

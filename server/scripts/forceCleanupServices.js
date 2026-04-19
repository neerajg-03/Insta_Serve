const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Service = require('../models/Service');

async function forceCleanupServices() {
  console.log('🧹 Force cleaning up ALL services...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Get all services
    console.log('1. 📋 Getting all services from database...');
    const allServices = await Service.find({});
    console.log(`✅ Found ${allServices.length} services in database\n`);

    if (allServices.length === 0) {
      console.log('✅ No services to clean up');
      return;
    }

    // Display services before deletion
    console.log('2. 📊 Services to be deleted:');
    allServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} (ID: ${service._id})`);
      console.log(`      Provider: ${service.provider || 'Unknown'}`);
      console.log(`      Bookings: ${service.bookingCount || 0}`);
      console.log(`      Status: ${service.isApproved ? 'Approved' : 'Pending'}`);
      console.log('');
    });

    // Force delete all services
    console.log('3. 🗑️ Force deleting all services...');
    
    const deleteResult = await Service.deleteMany({});
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} services`);

    // Verify cleanup
    console.log('\n4. 🔍 Verifying cleanup...');
    const remainingServices = await Service.find({});
    console.log(`   📊 Remaining services: ${remainingServices.length}`);

    if (remainingServices.length === 0) {
      console.log('   🎉 SUCCESS: All services cleaned up!');
    } else {
      console.log('   ⚠️ Some services still remain');
      remainingServices.forEach(service => {
        console.log(`     - ${service.title} (ID: ${service._id})`);
      });
    }

  } catch (error) {
    console.error('❌ Force cleanup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the force cleanup
forceCleanupServices().then(() => {
  console.log('\n🎯 Force cleanup completed!');
}).catch(error => {
  console.error('\n💥 Force cleanup crashed:', error);
});

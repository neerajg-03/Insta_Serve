const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

async function testFixes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Test 1: Check admin service requests query (what admin API should return)
    console.log('\n🔍 Test 1: Admin service requests query');
    const adminQuery = { 
      provider: { $exists: true, $ne: null },
      isApproved: false 
    };
    const pendingRequests = await Service.find(adminQuery)
      .populate('provider', 'name email phone')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${pendingRequests.length} pending provider requests:`);
    pendingRequests.forEach(req => {
      console.log(`  - ${req.title} by ${req.provider?.name} (ID: ${req._id})`);
    });

    // Test 2: Check public services query (what customers should see)
    console.log('\n🔍 Test 2: Public services query');
    const publicQuery = {
      isActive: true,
      isApproved: true
    };
    const publicServices = await Service.find(publicQuery)
      .populate('provider', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`Found ${publicServices.length} services available to public:`);
    publicServices.forEach(service => {
      const provider = service.provider ? `by ${service.provider.name}` : '(Admin service type)';
      console.log(`  - ${service.title} ${provider} - ${service.isApproved ? 'Approved' : 'Pending'}`);
    });

    // Test 3: Check admin-created services
    console.log('\n🔍 Test 3: Admin-created services');
    const adminServices = await Service.find({ 
      provider: null, 
      createdBy: 'admin' 
    });
    
    console.log(`Found ${adminServices.length} admin-created services:`);
    adminServices.forEach(service => {
      console.log(`  - ${service.title} (${service.providerRequests?.length || 0} provider requests)`);
    });

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing fixes:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testFixes();

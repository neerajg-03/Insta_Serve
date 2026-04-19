const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

const testServicesAPI = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Simulate the exact API query
    console.log('\n🌐 1. Testing Services API Query:');
    const query = {
      isActive: true,
      isApproved: true,
      provider: null,
      createdBy: 'admin'
    };
    
    const services = await Service.find(query)
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`✅ Found ${services.length} services:`);
    services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      ID: ${service._id}`);
      console.log(`      Category: ${service.category}`);
      console.log(`      Price: ₹${service.price}`);
      console.log(`      Active: ${service.isActive}`);
      console.log(`      Approved: ${service.isApproved}`);
      console.log(`      Provider: ${service.provider}`);
      console.log(`      Created By: ${service.createdBy}`);
      console.log('');
    });

    // Test with pagination
    console.log('\n📄 2. Testing Pagination:');
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const paginatedServices = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`✅ Page ${page} (${limit} per page): ${paginatedServices.length} services`);

    // Check if there are any services that should be included but aren't
    console.log('\n🔍 3. Checking for Services That Should Be Included:');
    const allActiveServices = await Service.find({
      isActive: true,
      isApproved: true
    });

    console.log(`✅ Total active & approved services: ${allActiveServices.length}`);
    
    const shouldShowButDont = allActiveServices.filter(service => 
      !query.provider ? service.provider !== null : service.provider === query.provider &&
      (!query.createdBy || service.createdBy !== query.createdBy)
    );

    console.log(`⚠️  Services that should show but don't: ${shouldShowButDont.length}`);
    shouldShowButDont.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      Provider: ${service.provider}`);
      console.log(`      Created By: ${service.createdBy}`);
    });

    // Check the exact 3 admin services we know exist
    console.log('\n🎯 4. Verifying Known Admin Services:');
    const knownServices = await Service.find({
      _id: { 
        $in: [
          '69c92cdccf06433fa8a51697',
          '69c92cdccf06433fa8a51695', 
          '69c9240e7d0d98a3ee8d83f8'
        ]
      }
    });

    console.log(`✅ Found ${knownServices.length} known admin services:`);
    knownServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      Matches API criteria: ${JSON.stringify({
        isActive: service.isActive,
        isApproved: service.isApproved,
        provider: service.provider,
        createdBy: service.createdBy
      })}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

testServicesAPI();

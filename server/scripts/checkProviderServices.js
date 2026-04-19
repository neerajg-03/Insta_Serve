const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

const checkProviderServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // 1. Check admin services (for broadcast booking)
    console.log('\n📋 1. Admin Services (Available for Broadcast):');
    const adminServices = await Service.find({
      provider: null,
      createdBy: 'admin',
      isActive: true,
      isApproved: true
    });
    
    console.log(`✅ Found ${adminServices.length} admin services:`);
    adminServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.title} (ID: ${service._id})`);
      console.log(`     Category: ${service.category}, Price: ₹${service.price}`);
    });

    // 2. Check provider service requests
    console.log('\n👥 2. Provider Service Requests:');
    const providerServices = await Service.find({
      provider: { $exists: true, $ne: null },
      serviceReference: { $exists: true }
    }).populate('provider', 'name email');

    console.log(`✅ Found ${providerServices.length} provider services:`);
    providerServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.title}`);
      console.log(`     Provider: ${service.provider.name} (${service.provider.email})`);
      console.log(`     Status: ${service.isActive ? 'Active' : 'Inactive'} | Approved: ${service.isApproved ? 'Yes' : 'No'}`);
      console.log(`     References: ${service.serviceReference}`);
      console.log('');
    });

    // 3. Check which providers can receive broadcast bookings
    console.log('\n📢 3. Broadcast Booking Eligibility:');
    for (const adminService of adminServices) {
      const availableProviders = await Service.find({
        serviceReference: adminService._id,
        isActive: true,
        isApproved: true
      }).populate('provider', 'name email');

      console.log(`\n📝 Service: ${adminService.title}`);
      if (availableProviders.length === 0) {
        console.log(`   ❌ No approved providers available for broadcast`);
        console.log(`   💡 Providers need to request and get approved for this service first`);
      } else {
        console.log(`   ✅ ${availableProviders.length} providers can receive broadcast requests:`);
        availableProviders.forEach((providerService, idx) => {
          console.log(`      ${idx + 1}. ${providerService.provider.name} (${providerService.provider.email})`);
        });
      }
    }

    // 4. Check existing providers
    console.log('\n🔍 4. Available Providers:');
    const providers = await User.find({ role: 'provider', isActive: true });
    console.log(`✅ Found ${providers.length} active providers:`);
    providers.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.name} (${provider.email})`);
    });

    console.log('\n🎯 Summary:');
    console.log('=====================================');
    console.log(`• Admin services: ${adminServices.length}`);
    console.log(`• Provider services: ${providerServices.length}`);
    console.log(`• Active providers: ${providers.length}`);
    
    if (providerServices.length === 0) {
      console.log('\n⚠️  ISSUE: No providers have requested to provide services yet!');
      console.log('📝 SOLUTION: Providers need to:');
      console.log('   1. Go to Provider Dashboard');
      console.log('   2. Browse Available Services');
      console.log('   3. Request to provide services');
      console.log('   4. Get approved by admin');
      console.log('   5. Then they can receive broadcast bookings');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkProviderServices();

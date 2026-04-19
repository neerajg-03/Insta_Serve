const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

const testBroadcastFix = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Find the tap repair service
    const tapRepairService = await Service.findOne({
      title: 'Tap Repairing',
      isApproved: true,
      isActive: true
    });

    if (!tapRepairService) {
      console.log('❌ No Tap Repairing service found');
      return;
    }

    console.log('\n🔍 Testing Broadcast Logic for:', tapRepairService.title);
    console.log('  - Service ID:', tapRepairService._id);
    console.log('  - Category:', tapRepairService.category);
    console.log('  - Provider:', tapRepairService.provider || 'None (Admin Service)');

    // Test the new logic
    const providersWithServices = await Service.find({
      category: tapRepairService.category,
      isActive: true,
      isApproved: true,
      provider: { $exists: true, $ne: null }
    }).populate('provider', 'name email isActive kycStatus').lean();

    const approvedProviders = providersWithServices
      .filter(service => 
        service.provider && 
        service.provider.isActive && 
        service.provider.kycStatus === 'approved'
      )
      .map(service => service.provider._id);

    console.log('\n📊 Results:');
    console.log('  - Services in Category Found:', providersWithServices.length);
    console.log('  - Approved Providers Count:', approvedProviders.length);
    
    if (approvedProviders.length > 0) {
      console.log('\n✅ SUCCESS: Found available providers!');
      console.log('  - Provider IDs:', approvedProviders);
      
      console.log('\n📋 Provider Details:');
      providersWithServices.forEach((service, index) => {
        if (service.provider && approvedProviders.includes(service.provider._id)) {
          console.log(`    ${index + 1}. ${service.provider.name} (${service.provider.email})`);
          console.log(`       Service: ${service.title}`);
          console.log(`       KYC Status: ${service.provider.kycStatus}`);
          console.log(`       Active: ${service.provider.isActive}`);
        }
      });
    } else {
      console.log('\n❌ ISSUE: No approved providers found');
      console.log('  - All services found:', providersWithServices.map(s => ({
          serviceTitle: s.title,
          providerName: s.provider?.name,
          providerEmail: s.provider?.email,
          providerActive: s.provider?.isActive,
          providerKYC: s.provider?.kycStatus,
          serviceApproved: s.isApproved
        })));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

testBroadcastFix();

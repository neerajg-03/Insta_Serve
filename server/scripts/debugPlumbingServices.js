const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

const debugPlumbingServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Find ALL plumbing services
    const plumbingServices = await Service.find({
      category: 'plumbing',
      isActive: true,
      isApproved: true
    }).populate('provider', 'name email isActive kycStatus').lean();

    console.log('\n🔧 All Plumbing Services:');
    plumbingServices.forEach((service, index) => {
      console.log(`\n${index + 1}. ${service.title}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Provider: ${service.provider ? service.provider.name : 'None'}`);
      console.log(`   Provider ID: ${service.provider ? service.provider._id : 'None'}`);
      console.log(`   Active: ${service.isActive}`);
      console.log(`   Approved: ${service.isApproved}`);
      console.log(`   Created By: ${service.createdBy || 'Not set'}`);
      console.log(`   Service Reference: ${service.serviceReference || 'None'}`);
    });

    // Check Rohit specifically
    console.log('\n👨‍🔧 Checking Rohit specifically:');
    const rohit = await User.findOne({ email: 'rohit123@gmail.com' });
    if (rohit) {
      console.log(`  - Rohit ID: ${rohit._id}`);
      console.log(`  - KYC Status: ${rohit.kycStatus}`);
      console.log(`  - Active: ${rohit.isActive}`);
      console.log(`  - Services in Array: ${rohit.services?.length || 0}`);
      
      // Find services where Rohit is the provider
      const rohitServices = await Service.find({
        provider: rohit._id,
        isActive: true,
        isApproved: true
      });
      
      console.log(`  - Services where Rohit is provider: ${rohitServices.length}`);
      rohitServices.forEach((service, index) => {
        console.log(`    ${index + 1}. ${service.title} (${service.category})`);
      });
    }

    // Test the exact query from bookings.js
    console.log('\n🔍 Testing exact query from bookings.js:');
    const providersWithServices = await Service.find({
      category: 'plumbing',
      isActive: true,
      isApproved: true,
      provider: { $exists: true, $ne: null }
    }).populate('provider', 'name email isActive kycStatus').lean();

    console.log(`  - Found ${providersWithServices.length} services with providers`);
    
    const approvedProviders = providersWithServices
      .filter(service => 
        service.provider && 
        service.provider.isActive && 
        service.provider.kycStatus === 'approved'
      )
      .map(service => service.provider._id);

    console.log(`  - Approved providers: ${approvedProviders.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

debugPlumbingServices();

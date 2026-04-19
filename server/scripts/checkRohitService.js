const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

const checkRohitService = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Find Rohit
    const rohit = await User.findOne({ email: 'rohit123@gmail.com' });
    if (!rohit) {
      console.log('❌ Rohit not found');
      return;
    }

    console.log(`👨‍🔧 Found Rohit: ${rohit.name} (${rohit._id})`);
    console.log(`  - KYC Status: ${rohit.kycStatus}`);
    console.log(`  - Active: ${rohit.isActive}`);

    // Find ALL services by Rohit
    const rohitAllServices = await Service.find({ provider: rohit._id });
    console.log(`\n📋 All Rohit's services: ${rohitAllServices.length}`);
    rohitAllServices.forEach((service, index) => {
      console.log(`\n${index + 1}. ${service.title}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Category: ${service.category}`);
      console.log(`   Active: ${service.isActive}`);
      console.log(`   Approved: ${service.isApproved}`);
      console.log(`   Created By: ${service.createdBy}`);
      console.log(`   Service Reference: ${service.serviceReference}`);
    });

    // Check the second service specifically
    const secondService = await Service.findById('69d0fd074b8ebd1a8329870b');
    if (secondService) {
      console.log('\n🔍 Checking second service (69d0fd074b8ebd1a8329870b):');
      console.log(`  - Title: ${secondService.title}`);
      console.log(`  - Provider: ${secondService.provider}`);
      console.log(`  - Category: ${secondService.category}`);
      console.log(`  - Active: ${secondService.isActive}`);
      console.log(`  - Approved: ${secondService.isApproved}`);
      console.log(`  - Created By: ${secondService.createdBy}`);
    }

    // Fix the issue: Update Rohit's service to be active and approved
    if (rohitAllServices.length > 0) {
      console.log('\n🔧 Fixing Rohit\'s services...');
      await Service.updateMany(
        { provider: rohit._id },
        { 
          isActive: true, 
          isApproved: true 
        }
      );
      console.log('✅ Rohit\'s services updated to be active and approved!');
    }

    // Test again
    const updatedServices = await Service.find({
      provider: rohit._id,
      isActive: true,
      isApproved: true
    });
    console.log(`\n🎉 Rohit's active & approved services: ${updatedServices.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkRohitService();

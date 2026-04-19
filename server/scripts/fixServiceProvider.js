const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Service = require('../models/Service');
const User = require('../models/User');

async function fixServiceProvider() {
  console.log('🔧 Fixing service provider association...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Find Sahil (provider)
    console.log('1. 👤 Finding Sahil (provider)...');
    const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
    
    if (!sahil) {
      console.log('❌ Sahil not found in database');
      return;
    }

    console.log(`✅ Found Sahil: ${sahil.name} (ID: ${sahil._id})`);

    // Find the Tap Repairing service
    console.log('2. 🔍 Finding Tap Repairing service...');
    const tapService = await Service.findOne({ title: 'Tap Repairing' });
    
    if (!tapService) {
      console.log('❌ Tap Repairing service not found');
      return;
    }

    console.log(`✅ Found service: ${tapService.title} (ID: ${tapService._id})`);
    console.log(`   Current provider: ${tapService.provider || 'None'}`);

    // Update the service to associate with Sahil
    console.log('3. 🔗 Updating service provider association...');
    tapService.provider = sahil._id;
    tapService.createdBy = 'provider'; // Set as provider-created
    await tapService.save();

    console.log('✅ Service updated successfully!');
    console.log(`   New provider: ${sahil.name} (${sahil.email})`);
    console.log(`   Service type: ${tapService.createdBy}`);

    // Verify the update
    console.log('4. 🔍 Verifying update...');
    const updatedService = await Service.findById(tapService._id).populate('provider');
    
    if (updatedService && updatedService.provider) {
      console.log('✅ Provider association verified:');
      console.log(`   Provider: ${updatedService.provider.name} (${updatedService.provider.email})`);
      console.log(`   Service: ${updatedService.title}`);
      console.log(`   Status: ${updatedService.isApproved ? 'Approved' : 'Pending'}`);
    } else {
      console.log('❌ Provider association failed');
    }

    // Test the new endpoint
    console.log('5. 🧪 Testing provider available services endpoint...');
    
    // Simulate API call to provider/available endpoint
    const availableServices = await Service.find({
      isApproved: true,
      isActive: true
    }).populate('provider', 'name email');

    console.log(`✅ Found ${availableServices.length} available services:`);
    availableServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - Provider: ${service.provider?.name || 'Unknown'}`);
    });

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the fix
fixServiceProvider().then(() => {
  console.log('\n🎯 Service provider fix completed!');
}).catch(error => {
  console.error('\n💥 Fix crashed:', error);
});

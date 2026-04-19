const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Service = require('../models/Service');
const User = require('../models/User');

async function checkServiceStatus() {
  console.log('🔍 Checking service status in detail...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Get all services
    const services = await Service.find({}).populate('provider');
    console.log(`✅ Found ${services.length} services:\n`);

    services.forEach((service, index) => {
      console.log(`${index + 1}. 📋 ${service.title}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Provider: ${service.provider?.name || 'None'}`);
      console.log(`   isApproved: ${service.isApproved}`);
      console.log(`   isActive: ${service.isActive}`);
      console.log(`   Price: ₹${service.price}`);
      console.log(`   Category: ${service.category}`);
      console.log(`   Created by: ${service.createdBy}`);
      console.log('');
    });

    // Check the specific service
    const tapService = await Service.findOne({ title: 'Tap Repairing' }).populate('provider');
    
    if (tapService) {
      console.log('🎯 Tap Repairing Service Details:');
      console.log(`   Title: ${tapService.title}`);
      console.log(`   Provider: ${tapService.provider?.name || 'None'}`);
      console.log(`   isApproved: ${tapService.isApproved}`);
      console.log(`   isActive: ${tapService.isActive}`);
      console.log(`   Price: ₹${tapService.price}`);
      
      // Fix the service if needed
      if (!tapService.isApproved || !tapService.isActive) {
        console.log('\n🔧 Fixing service status...');
        tapService.isApproved = true;
        tapService.isActive = true;
        await tapService.save();
        console.log('✅ Service status fixed!');
      }
    }

    // Test the available services query
    console.log('\n🧪 Testing available services query...');
    const availableServices = await Service.find({
      isApproved: true,
      isActive: true
    }).populate('provider');
    
    console.log(`✅ Available services count: ${availableServices.length}`);
    availableServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - Provider: ${service.provider?.name || 'Unknown'}`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the check
checkServiceStatus().then(() => {
  console.log('\n🎯 Service status check completed!');
}).catch(error => {
  console.error('\n💥 Check crashed:', error);
});

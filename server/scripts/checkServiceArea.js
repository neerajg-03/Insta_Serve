const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Service = require('../models/Service');
const User = require('../models/User');

async function checkServiceArea() {
  console.log('🗺️ Checking service area and location settings...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Check the service
    console.log('1. 📋 Checking Tap Repairing service...');
    const service = await Service.findOne({ title: 'Tap Repairing' }).populate('provider');
    
    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('✅ Service details:');
    console.log(`   Title: ${service.title}`);
    console.log(`   Provider: ${service.provider?.name}`);
    console.log(`   Service Area: ${service.serviceArea || 'NOT SET'}`);
    console.log(`   Max Distance: ${service.maxDistance || 'NOT SET'} km`);
    console.log(`   Category: ${service.category}`);

    // Check provider address
    console.log('\n2. 👤 Checking provider address...');
    if (service.provider) {
      console.log(`   Provider: ${service.provider.name}`);
      console.log(`   Address: ${service.provider.address?.street || 'NOT SET'}`);
      console.log(`   City: ${service.provider.address?.city || 'NOT SET'}`);
      console.log(`   State: ${service.provider.address?.state || 'NOT SET'}`);
      console.log(`   Pincode: ${service.provider.address?.pincode || 'NOT SET'}`);
    }

    // Fix service area if not set
    if (!service.serviceArea) {
      console.log('\n🔧 Setting service area...');
      service.serviceArea = 'Delhi NCR, Mumbai, Pune, Bangalore, Chennai';
      service.maxDistance = 10;
      await service.save();
      console.log('✅ Service area updated!');
      console.log(`   New Service Area: ${service.serviceArea}`);
      console.log(`   Max Distance: ${service.maxDistance} km`);
    }

    // Test location-based search
    console.log('\n3. 🧪 Testing location-based search...');
    
    // Test with Delhi location
    console.log('   Testing search with location="Delhi"...');
    const delhiServices = await Service.find({
      isActive: true,
      isApproved: true,
      serviceArea: { $regex: 'Delhi', $options: 'i' }
    }).populate('provider');

    console.log(`   ✅ Found ${delhiServices.length} services in Delhi area:`);
    delhiServices.forEach((s, index) => {
      console.log(`     ${index + 1}. ${s.title} - ${s.provider?.name || 'Unknown'}`);
    });

    // Test without location filter
    console.log('\n   Testing search without location filter...');
    const allServices = await Service.find({
      isActive: true,
      isApproved: true
    }).populate('provider');

    console.log(`   ✅ Found ${allServices.length} total services:`);
    allServices.forEach((s, index) => {
      console.log(`     ${index + 1}. ${s.title} - ${s.provider?.name || 'Unknown'}`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the check
checkServiceArea().then(() => {
  console.log('\n🎯 Service area check completed!');
}).catch(error => {
  console.error('\n💥 Check crashed:', error);
});

const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
require('dotenv').config();

const testBookingCreation = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // 1. Check providers like the booking API does
    console.log('\n👥 1. Checking Providers (Booking API Logic):');
    const availableProviders = await User.find({
      role: 'provider',
      isActive: true
    });

    console.log(`✅ Found ${availableProviders.length} providers:`);
    availableProviders.forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.name} (${provider.email})`);
      console.log(`      Role: ${provider.role}`);
      console.log(`      Active: ${provider.isActive}`);
      console.log(`      Approved: ${provider.isApproved}`);
    });

    // 2. Check admin services
    console.log('\n📋 2. Checking Admin Services:');
    const adminServices = await Service.find({
      provider: null,
      createdBy: 'admin',
      isActive: true,
      isApproved: true
    });

    console.log(`✅ Found ${adminServices.length} admin services:`);
    adminServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price}`);
    });

    // 3. Simulate booking creation
    if (adminServices.length > 0 && availableProviders.length > 0) {
      console.log('\n🧪 3. Simulating Booking Creation:');
      const testService = adminServices[0];
      console.log(`📝 Testing with service: ${testService.title}`);
      
      console.log(`👥 Providers available for broadcast: ${availableProviders.length}`);
      console.log('✅ Booking creation should succeed!');
      
      // Test the exact query from booking route
      const testProviders = await User.find({
        role: 'provider',
        isActive: true
      });
      
      console.log(`🔍 Query result: ${testProviders.length} providers found`);
      
      if (testProviders.length === 0) {
        console.log('❌ ISSUE: Query returned no providers!');
        console.log('📝 This is why booking creation fails');
      } else {
        console.log('✅ Query returned providers - booking should work');
      }
    } else {
      console.log('\n❌ Cannot test booking creation:');
      if (adminServices.length === 0) {
        console.log('   - No admin services found');
      }
      if (availableProviders.length === 0) {
        console.log('   - No active providers found');
      }
    }

    // 4. Check if there are any database connection issues
    console.log('\n🔍 4. Database Connection Check:');
    const totalUsers = await User.countDocuments();
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const activeProviders = await User.countDocuments({ role: 'provider', isActive: true });
    const approvedProviders = await User.countDocuments({ role: 'provider', isApproved: true });
    
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Total providers: ${totalProviders}`);
    console.log(`   Active providers: ${activeProviders}`);
    console.log(`   Approved providers: ${approvedProviders}`);
    console.log(`   Active & Approved: ${await User.countDocuments({ role: 'provider', isActive: true, isApproved: true })}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

testBookingCreation();

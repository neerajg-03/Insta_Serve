const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

const debugServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // 1. Check all services
    console.log('\n📋 1. All Services in Database:');
    const allServices = await Service.find({});
    console.log(`✅ Total services: ${allServices.length}`);
    
    allServices.forEach((service, index) => {
      console.log(`\n${index + 1}. ${service.title}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Category: ${service.category}`);
      console.log(`   Provider: ${service.provider || 'None (Admin Service)'}`);
      console.log(`   Created By: ${service.createdBy || 'Unknown'}`);
      console.log(`   Active: ${service.isActive}`);
      console.log(`   Approved: ${service.isApproved}`);
      console.log(`   Price: ₹${service.price}`);
    });

    // 2. Check admin services specifically
    console.log('\n\n👑 2. Admin Services (Should show on customer page):');
    const adminServices = await Service.find({
      provider: null,
      createdBy: 'admin',
      isActive: true,
      isApproved: true
    });
    
    console.log(`✅ Admin services found: ${adminServices.length}`);
    adminServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price}`);
    });

    // 3. Check what the services API returns
    console.log('\n\n🌐 3. Simulating Services API Call (Customer View):');
    const apiQuery = {
      isActive: true,
      isApproved: true,
      provider: null,
      createdBy: 'admin'
    };
    
    const customerServices = await Service.find(apiQuery);
    console.log(`✅ Services API would return: ${customerServices.length}`);
    customerServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
    });

    // 4. Check providers
    console.log('\n\n👥 4. Available Providers:');
    const providers = await User.find({
      role: 'provider',
      isActive: true,
      isApproved: true
    });
    
    console.log(`✅ Active providers: ${providers.length}`);
    providers.forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.name} (${provider.email})`);
      console.log(`      Service Area: ${provider.serviceArea || 'Not specified'}`);
    });

    // 5. Check if there are any service requests from providers
    console.log('\n\n📝 5. Provider Service Requests:');
    const providerServices = await Service.find({
      provider: { $exists: true, $ne: null }
    }).populate('provider', 'name email');
    
    console.log(`✅ Provider services: ${providerServices.length}`);
    providerServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} by ${service.provider.name}`);
      console.log(`      Status: ${service.isApproved ? 'Approved' : 'Pending'}`);
      console.log(`      Active: ${service.isActive}`);
    });

    console.log('\n\n🎯 Summary:');
    console.log('=====================================');
    console.log(`• Total services: ${allServices.length}`);
    console.log(`• Admin services: ${adminServices.length}`);
    console.log(`• Active providers: ${providers.length}`);
    console.log(`• Provider services: ${providerServices.length}`);
    
    if (adminServices.length === 0) {
      console.log('\n⚠️  ISSUE: No admin services found!');
      console.log('📝 This means customers won\'t see any services to book');
    }
    
    if (providers.length === 0) {
      console.log('\n⚠️  ISSUE: No active providers found!');
      console.log('📝 This means broadcast requests won\'t be sent to anyone');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

debugServices();

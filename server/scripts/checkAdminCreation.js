const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
require('dotenv').config();

const checkAdminCreation = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // 1. Check admin users
    console.log('\n👑 1. Admin Users:');
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`✅ Found ${adminUsers.length} admin users:`);
    adminUsers.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.name} (${admin.email})`);
      console.log(`      ID: ${admin._id}`);
      console.log(`      Active: ${admin.isActive}`);
      console.log('');
    });

    // 2. Check services created by admin in last 24 hours
    console.log('\n🕐 2. Services Created by Admin in Last 24 Hours:');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAdminServices = await Service.find({
      createdBy: 'admin',
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${recentAdminServices.length} recent admin services:`);
    recentAdminServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      Created: ${service.createdAt}`);
      console.log(`      Price: ₹${service.price}`);
    });

    // 3. Check ALL services created in last 24 hours
    console.log('\n🕐 3. ALL Services Created in Last 24 Hours:');
    const allRecentServices = await Service.find({
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${allRecentServices.length} total recent services:`);
    allRecentServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      Created By: ${service.createdBy || 'Unknown'}`);
      console.log(`      Provider: ${service.provider || 'None'}`);
      console.log(`      Created: ${service.createdAt}`);
      console.log('');
    });

    // 4. Check if there are any services with missing createdBy
    console.log('\n❓ 4. Services with Missing createdBy:');
    const servicesWithoutCreatedBy = await Service.find({
      createdBy: { $exists: false }
    });

    console.log(`⚠️  Found ${servicesWithoutCreatedBy.length} services without createdBy:`);
    servicesWithoutCreatedBy.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      Provider: ${service.provider || 'None'}`);
      console.log(`      Created: ${service.createdAt}`);
    });

    // 5. Check the current admin services that should be visible
    console.log('\n🎯 5. Current Admin Services (Should be visible):');
    const currentAdminServices = await Service.find({
      isActive: true,
      isApproved: true,
      provider: null,
      createdBy: 'admin'
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${currentAdminServices.length} admin services that should be visible:`);
    currentAdminServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price}`);
      console.log(`      Category: ${service.category}`);
      console.log(`      Created: ${service.createdAt.toLocaleDateString()}`);
    });

    console.log('\n🎯 Summary:');
    console.log('=====================================');
    console.log(`• Admin users: ${adminUsers.length}`);
    console.log(`• Recent admin services (24h): ${recentAdminServices.length}`);
    console.log(`• Total recent services (24h): ${allRecentServices.length}`);
    console.log(`• Missing createdBy: ${servicesWithoutCreatedBy.length}`);
    console.log(`• Visible admin services: ${currentAdminServices.length}`);

    if (recentAdminServices.length === 0 && allRecentServices.length > 0) {
      console.log('\n⚠️  ISSUE: Recent services were not created by admin!');
      console.log('📝 This means you might be creating services as a provider, not admin');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkAdminCreation();

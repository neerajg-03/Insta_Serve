const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

const checkRecentServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // 1. Check all admin services
    console.log('\n👑 1. All Admin Services:');
    const adminServices = await Service.find({
      createdBy: 'admin'
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${adminServices.length} admin services:`);
    adminServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      ID: ${service._id}`);
      console.log(`      Category: ${service.category}`);
      console.log(`      Price: ₹${service.price}`);
      console.log(`      Active: ${service.isActive}`);
      console.log(`      Approved: ${service.isApproved}`);
      console.log(`      Created: ${service.createdAt}`);
      console.log('');
    });

    // 2. Check what the API would return
    console.log('\n🌐 2. What Services API Returns:');
    const apiQuery = {
      isActive: true,
      isApproved: true,
      provider: null,
      createdBy: 'admin'
    };
    
    const apiServices = await Service.find(apiQuery).sort({ createdAt: -1 });
    console.log(`✅ API would return ${apiServices.length} services:`);
    apiServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price}`);
    });

    // 3. Check for services without createdBy
    console.log('\n❓ 3. Services Without createdBy Field:');
    const servicesWithoutCreatedBy = await Service.find({
      createdBy: { $exists: false }
    });

    console.log(`⚠️  Found ${servicesWithoutCreatedBy.length} services without createdBy:`);
    servicesWithoutCreatedBy.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      Provider: ${service.provider || 'None'}`);
      console.log(`      Created: ${service.createdAt}`);
    });

    // 4. Check all services created in last 24 hours
    console.log('\n🕐 4. Services Created in Last 24 Hours:');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentServices = await Service.find({
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${recentServices.length} recent services:`);
    recentServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`);
      console.log(`      Created By: ${service.createdBy || 'Unknown'}`);
      console.log(`      Provider: ${service.provider || 'None'}`);
      console.log(`      Created: ${service.createdAt}`);
    });

    console.log('\n🎯 Summary:');
    console.log('=====================================');
    console.log(`• Total admin services: ${adminServices.length}`);
    console.log(`• API would return: ${apiServices.length}`);
    console.log(`• Missing createdBy: ${servicesWithoutCreatedBy.length}`);
    console.log(`• Created last 24h: ${recentServices.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkRecentServices();

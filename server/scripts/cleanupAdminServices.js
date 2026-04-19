const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

const cleanupAdminServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Find all admin services
    const adminServices = await Service.find({
      provider: null,
      createdBy: 'admin'
    });

    console.log(`📋 Found ${adminServices.length} admin services`);

    // Group by title and keep only the latest one
    const serviceMap = new Map();
    
    adminServices.forEach(service => {
      const key = `${service.title}_${service.category}`;
      if (!serviceMap.has(key) || service.createdAt > serviceMap.get(key).createdAt) {
        serviceMap.set(key, service);
      }
    });

    console.log(`🧹 Keeping ${serviceMap.size} unique admin services`);

    // Delete duplicates
    const toKeep = new Set(Array.from(serviceMap.values()).map(s => s._id.toString()));
    const toDelete = adminServices.filter(s => !toKeep.has(s._id.toString()));

    if (toDelete.length > 0) {
      console.log(`🗑️  Deleting ${toDelete.length} duplicate services...`);
      
      for (const service of toDelete) {
        await Service.findByIdAndDelete(service._id);
        console.log(`   Deleted: ${service.title}`);
      }
    } else {
      console.log('✅ No duplicates found');
    }

    // Show final admin services
    const finalAdminServices = await Service.find({
      provider: null,
      createdBy: 'admin',
      isActive: true,
      isApproved: true
    });

    console.log('\n📋 Final Admin Services:');
    finalAdminServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price} (${service.category})`);
    });

    console.log('\n🎯 Admin services cleanup completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

cleanupAdminServices();

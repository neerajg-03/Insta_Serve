const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

async function clearAllServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Count all services before deletion
    const totalServices = await Service.countDocuments();
    console.log(`📊 Found ${totalServices} services in database`);

    if (totalServices === 0) {
      console.log('ℹ️  No services to delete');
      return;
    }

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will delete ALL services from the database!');
    console.log('🗑️  Deleting all services...');

    // Delete all services
    const result = await Service.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} services`);
    console.log('🎉 Database is now ready for admin to create fresh services');

  } catch (error) {
    console.error('❌ Error clearing services:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clearAllServices();

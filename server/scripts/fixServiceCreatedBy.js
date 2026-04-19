const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

async function fixServiceCreatedBy() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all admin-created services (provider: null) that have incorrect createdBy field
    const adminServices = await Service.find({ provider: null });
    console.log(`\n🔍 Found ${adminServices.length} admin-created services`);

    let fixedCount = 0;
    
    for (const service of adminServices) {
      if (service.createdBy !== 'admin') {
        console.log(`\n🔧 Fixing service: ${service.title}`);
        console.log(`   Current createdBy: ${service.createdBy}`);
        
        service.createdBy = 'admin';
        await service.save();
        
        console.log(`   ✅ Fixed createdBy to: admin`);
        fixedCount++;
      } else {
        console.log(`✅ Service already correct: ${service.title} (createdBy: ${service.createdBy})`);
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} services`);

    // Verify the fix
    const verifiedServices = await Service.find({ 
      provider: null, 
      createdBy: 'admin' 
    });
    console.log(`\n✅ Verified ${verifiedServices.length} admin-created services with correct createdBy field`);

  } catch (error) {
    console.error('❌ Error fixing services:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixServiceCreatedBy();

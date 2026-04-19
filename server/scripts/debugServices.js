const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

async function debugServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check all services
    const allServices = await Service.find({});
    console.log(`\n📊 Total services in database: ${allServices.length}`);

    // Check admin-created services
    const adminServices = await Service.find({ createdBy: 'admin' });
    console.log(`\n👨‍💼 Admin-created services: ${adminServices.length}`);

    // Check services with all required fields
    const availableServices = await Service.find({
      isActive: true,
      isApproved: true,
      createdBy: 'admin'
    });
    console.log(`\n✅ Available services (matching API query): ${availableServices.length}`);

    if (adminServices.length > 0) {
      console.log('\n📋 Admin service details:');
      adminServices.forEach((service, index) => {
        console.log(`\n${index + 1}. ${service.title}`);
        console.log(`   - isActive: ${service.isActive}`);
        console.log(`   - isApproved: ${service.isApproved}`);
        console.log(`   - createdBy: ${service.createdBy}`);
        console.log(`   - provider: ${service.provider}`);
        console.log(`   - price: ${service.price}`);
      });
    }

    if (availableServices.length > 0) {
      console.log('\n🎯 Available services (should show in provider dashboard):');
      availableServices.forEach((service, index) => {
        console.log(`${index + 1}. ${service.title} - ₹${service.price}`);
      });
    } else {
      console.log('\n❌ No available services found! This is the problem.');
      
      if (adminServices.length > 0) {
        console.log('\n🔧 Fixing services to make them available...');
        await Service.updateMany(
          { createdBy: 'admin' },
          { 
            isActive: true, 
            isApproved: true 
          }
        );
        console.log('✅ Services updated to be active and approved!');
        
        // Check again
        const updatedServices = await Service.find({
          isActive: true,
          isApproved: true,
          createdBy: 'admin'
        });
        console.log(`\n🎉 Now available: ${updatedServices.length} services`);
      }
    }

  } catch (error) {
    console.error('❌ Error debugging services:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

debugServices();

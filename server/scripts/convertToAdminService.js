const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

const convertToAdminService = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Find the Tap Repairing service
    const tapRepairingServices = await Service.find({
      title: 'Tap Repairing',
      createdBy: 'provider'
    });

    console.log(`🔧 Found ${tapRepairingServices.length} Tap Repairing services created by provider:`);

    for (const service of tapRepairingServices) {
      console.log(`\n📝 Converting service: ${service.title}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Price: ₹${service.price}`);
      console.log(`   Current createdBy: ${service.createdBy}`);
      console.log(`   Current provider: ${service.provider}`);

      // Convert to admin service
      service.createdBy = 'admin';
      service.provider = null;
      service.isApproved = true;
      service.isActive = true;
      
      await service.save();
      
      console.log(`   ✅ Converted to admin service`);
      console.log(`   New createdBy: ${service.createdBy}`);
      console.log(`   New provider: ${service.provider}`);
    }

    // Verify the conversion
    console.log('\n🔍 Verifying conversion:');
    const adminServices = await Service.find({
      title: 'Tap Repairing',
      createdBy: 'admin'
    });

    console.log(`✅ Found ${adminServices.length} Tap Repairing admin services:`);
    adminServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price}`);
      console.log(`      Created By: ${service.createdBy}`);
      console.log(`      Provider: ${service.provider}`);
    });

    // Check what will appear on services page
    console.log('\n🌐 Services Page Preview:');
    const servicesPageQuery = {
      isActive: true,
      isApproved: true,
      provider: null,
      createdBy: 'admin'
    };
    
    const visibleServices = await Service.find(servicesPageQuery).sort({ createdAt: -1 });
    console.log(`✅ Services page will now show ${visibleServices.length} services:`);
    visibleServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price}`);
    });

    console.log('\n🎉 Conversion completed! The Tap Repairing service should now appear on the services page.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

convertToAdminService();

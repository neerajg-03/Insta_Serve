const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');

async function restoreRohitServices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    // Find Rohit
    const rohit = await User.findOne({ name: /rohit/i });
    if (!rohit) {
      console.log('Provider Rohit not found');
      return;
    }
    
    console.log('Restoring services for provider:', rohit.name);
    
    // Create Rohit's approved services
    const servicesToCreate = [
      {
        title: 'Tap Repairing',
        description: 'Professional tap repair and installation services for residential and commercial properties',
        category: 'plumbing',
        subcategory: 'tap_repair',
        price: 500,
        priceType: 'fixed',
        duration: { value: 2, unit: 'hours' },
        serviceArea: 'Delhi, Mumbai, Bangalore',
        images: [],
        provider: rohit._id,
        isApproved: true,
        isActive: true
      },
      {
        title: 'Socket Repair',
        description: 'Expert electrical socket repair and installation services',
        category: 'electrical',
        subcategory: 'socket_repair',
        price: 600,
        priceType: 'fixed',
        duration: { value: 1, unit: 'hours' },
        serviceArea: 'Delhi, Mumbai, Bangalore',
        images: [],
        provider: rohit._id,
        isApproved: true,
        isActive: true
      }
    ];
    
    let createdCount = 0;
    
    for (const serviceData of servicesToCreate) {
      // Check if service already exists
      const existingService = await Service.findOne({
        title: serviceData.title,
        category: serviceData.category,
        provider: rohit._id
      });
      
      if (!existingService) {
        const service = new Service(serviceData);
        await service.save();
        console.log(`Created service: ${serviceData.title} (${serviceData.category})`);
        createdCount++;
      } else {
        console.log(`Service already exists: ${serviceData.title} (${serviceData.category})`);
      }
    }
    
    console.log(`Successfully restored ${createdCount} services for Rohit`);
    
    // Verify the services were created
    const rohitServices = await Service.find({ provider: rohit._id });
    console.log(`\nRohit now has ${rohitServices.length} services:`);
    
    rohitServices.forEach(service => {
      console.log(`  - ${service.title} (${service.category}) - Approved: ${service.isApproved}`);
    });
    
  } catch (error) {
    console.error('Error restoring Rohit services:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

restoreRohitServices();

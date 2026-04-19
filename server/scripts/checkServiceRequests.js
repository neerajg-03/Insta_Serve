const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

async function checkServiceRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all services
    const allServices = await Service.find({});
    console.log(`\n📊 Total services in database: ${allServices.length}`);
    
    // Find admin-created services (provider: null)
    const adminServices = await Service.find({ provider: null });
    console.log(`\n🏢 Admin-created services: ${adminServices.length}`);
    adminServices.forEach(service => {
      console.log(`  - ${service.title} (ID: ${service._id})`);
      console.log(`    Category: ${service.category}`);
      console.log(`    Provider: ${service.provider}`);
      console.log(`    Created by: ${service.createdBy}`);
      console.log(`    Provider requests: ${service.providerRequests?.length || 0}`);
      if (service.providerRequests && service.providerRequests.length > 0) {
        service.providerRequests.forEach(req => {
          console.log(`      Request from provider: ${req.provider}, Approved: ${req.isApproved}`);
        });
      }
    });

    // Find provider service requests (provider exists, isApproved: false)
    const providerRequests = await Service.find({ 
      provider: { $exists: true, $ne: null },
      isApproved: false 
    }).populate('provider', 'name email');
    console.log(`\n📋 Provider service requests: ${providerRequests.length}`);
    providerRequests.forEach(request => {
      console.log(`  - ${request.title} (ID: ${request._id})`);
      console.log(`    Provider: ${request.provider?.name} (${request.provider?.email})`);
      console.log(`    Category: ${request.category}`);
      console.log(`    Approved: ${request.isApproved}`);
      console.log(`    Active: ${request.isActive}`);
      console.log(`    Service Reference: ${request.serviceReference}`);
      console.log(`    Created by: ${request.createdBy}`);
    });

    // Find all provider services (approved)
    const providerServices = await Service.find({ 
      provider: { $exists: true, $ne: null },
      isApproved: true 
    }).populate('provider', 'name email');
    console.log(`\n✅ Approved provider services: ${providerServices.length}`);
    providerServices.forEach(service => {
      console.log(`  - ${service.title} by ${service.provider?.name}`);
    });

    // Check the specific query used by admin API
    const adminQueryResults = await Service.find({ 
      provider: { $exists: true, $ne: null } 
    }).populate('provider', 'name email phone');
    console.log(`\n🔍 Admin API query results: ${adminQueryResults.length}`);
    adminQueryResults.forEach(service => {
      console.log(`  - ${service.title} (${service.isApproved ? 'Approved' : 'Pending'}) - Provider: ${service.provider?.name}`);
    });

  } catch (error) {
    console.error('❌ Error checking service requests:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkServiceRequests();

const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

async function checkAllServicesDetailed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');

    // Check ALL services in detail
    const allServices = await Service.find({}).populate('provider', 'name email');
    
    console.log('=== ALL SERVICES IN DATABASE ===');
    console.log(`Total services: ${allServices.length}\n`);
    
    allServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.title || service.name || 'Untitled'}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Category: ${service.category || 'Not set'}`);
      console.log(`   Provider: ${service.provider ? service.provider.name : 'None'} (${service.provider ? service.provider.email : ''})`);
      console.log(`   Created By: ${service.createdBy || 'Not set'}`);
      console.log(`   Active: ${service.isActive}`);
      console.log(`   Approved: ${service.isApproved}`);
      console.log(`   Price: ${service.price || 'Not set'}`);
      console.log(`   Service Reference: ${service.serviceReference || 'None'}`);
      console.log('');
    });

    // Now let's check what service is being booked in the debug logs
    console.log('=== INVESTIGATING BOOKING ISSUE ===');
    
    // Since the debug shows "approved other service", let's check the booking logic
    console.log('The debug logs show "approved other service" which means:');
    console.log('1. A service exists in the category');
    console.log('2. Rohit has an approved service in that category');
    console.log('3. But it might not be the exact same service being booked');
    
    // Let's check what services Rohit actually has
    const rohit = await User.findOne({ email: 'rohit123@gmail.com' });
    if (rohit) {
      const rohitServices = await Service.find({ provider: rohit._id });
      console.log(`\nROHIT'S SERVICES (${rohitServices.length}):`);
      rohitServices.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.title || s.name} (${s.category})`);
        console.log(`     Active: ${s.isActive}, Approved: ${s.isApproved}`);
      });
    }
    
    // Let's check what services Jatin actually has
    const jatin = await User.findOne({ email: 'jatin123@gmail.com' });
    if (jatin) {
      const jatinServices = await Service.find({ provider: jatin._id });
      console.log(`\nJATIN'S SERVICES (${jatinServices.length}):`);
      jatinServices.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.title || s.name} (${s.category})`);
        console.log(`     Active: ${s.isApproved}, Approved: ${s.isApproved}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllServicesDetailed();

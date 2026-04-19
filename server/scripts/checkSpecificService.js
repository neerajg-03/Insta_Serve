const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

const checkSpecificService = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    const serviceId = '69bd15cadbc12cdb9d6baf8e';
    console.log(`🔍 Checking service with ID: ${serviceId}`);
    
    const service = await Service.findById(serviceId).populate('provider', 'name email');
    
    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('\n📋 Service Details:');
    console.log('===================');
    console.log(`📝 Title: ${service.title}`);
    console.log(`📝 Description: ${service.description}`);
    console.log(`🏷️  Category: ${service.category}`);
    console.log(`💰 Price: ₹${service.price}`);
    console.log(`⏱️  Duration: ${service.duration?.value || 0} ${service.duration?.unit || 'hours'}`);
    console.log(`📍 Service Area: ${service.serviceArea}`);
    console.log(`✅ Status: ${service.isApproved ? 'Approved' : 'Pending Approval'}`);
    console.log(`🟢 Active: ${service.isActive ? 'Yes' : 'No'}`);
    
    console.log('\n👤 Provider Information:');
    console.log('======================');
    if (service.provider) {
      console.log(`👤 Provider: ${service.provider.name} (${service.provider.email})`);
      console.log(`🆔 Provider ID: ${service.provider._id}`);
    } else {
      console.log('👤 Provider: NONE (Admin-created service)');
    }
    
    console.log('\n🔧 Service Creation Info:');
    console.log('========================');
    console.log(`👨‍💼 Created By: ${service.createdBy || 'provider'}`);
    console.log(`📅 Created: ${service.createdAt.toLocaleDateString()}`);
    console.log(`🔄 Updated: ${service.updatedAt.toLocaleDateString()}`);
    
    if (service.serviceReference) {
      console.log(`🔗 Service Reference: ${service.serviceReference}`);
    }
    
    console.log('\n📊 Provider Requests:');
    console.log('====================');
    if (service.providerRequests && service.providerRequests.length > 0) {
      console.log(`📈 Total Requests: ${service.providerRequests.length}`);
      service.providerRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. Provider: ${req.provider}`);
        console.log(`     Status: ${req.isApproved ? 'Approved' : 'Pending'}`);
        console.log(`     Date: ${req.createdAt.toLocaleDateString()}`);
      });
    } else {
      console.log('📈 Total Requests: 0');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkSpecificService();

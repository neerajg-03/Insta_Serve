const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
require('dotenv').config();

const testServiceApproval = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Check current services
    console.log('\n📋 Current Services:');
    console.log('====================');
    
    const services = await Service.find({}).populate('provider', 'name email');
    
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.title}`);
      console.log(`   Provider: ${service.provider ? service.provider.name : 'NONE (Admin)'}`);
      console.log(`   Approved: ${service.isApproved ? '✅ Yes' : '❌ No'}`);
      console.log(`   Active: ${service.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${service.createdAt.toLocaleDateString()}`);
      console.log('');
    });

    // Create a test service to check approval behavior
    console.log('🧪 Creating test service...');
    const testService = new Service({
      title: 'Test Service for Approval',
      description: 'This is a test service to check approval workflow',
      category: 'plumbing',
      subcategory: 'test',
      provider: '507f1f77bcf86cd799439011', // dummy provider ID
      price: 100,
      duration: { value: 1, unit: 'hours' },
      serviceArea: 'Test City'
    });

    await testService.save();
    console.log(`✅ Test service created with ID: ${testService._id}`);
    console.log(`   Initial approval status: ${testService.isApproved ? '✅ Approved' : '❌ Pending'}`);

    // Clean up test service
    await Service.findByIdAndDelete(testService._id);
    console.log('🧹 Test service cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

testServiceApproval();

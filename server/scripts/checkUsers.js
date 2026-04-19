const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

async function checkUsers() {
  console.log('👥 Checking all users in database...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Get all users
    const users = await User.find({});
    console.log(`✅ Found ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.isVerified ? 'Yes' : 'No'}`);
      console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check for specific users
    const customer = await User.findOne({ email: 'customer@example.com' });
    const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
    const admin = await User.findOne({ email: 'admin@instaserve.com' });

    console.log('📊 Specific Users Status:');
    console.log(`   Customer (customer@example.com): ${customer ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Sahil (sahil123@gmail.com): ${sahil ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Admin (admin@instaserve.com): ${admin ? '✅ Found' : '❌ Not found'}`);

    // Create test customer if not exists
    if (!customer) {
      console.log('\n🔧 Creating test customer...');
      const newCustomer = new User({
        name: 'Test Customer',
        email: 'customer@example.com',
        password: 'password123',
        role: 'customer',
        phone: '9876543210',
        isVerified: true,
        isActive: true
      });
      
      await newCustomer.save();
      console.log('✅ Test customer created successfully!');
      console.log(`   Email: customer@example.com`);
      console.log(`   Password: password123`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the check
checkUsers().then(() => {
  console.log('\n🎯 User check completed!');
}).catch(error => {
  console.error('\n💥 Check crashed:', error);
});

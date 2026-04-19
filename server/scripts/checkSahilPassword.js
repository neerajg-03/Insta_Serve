const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

async function checkSahilPassword() {
  console.log('🔍 Checking Sahil account details...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Find Sahil
    const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
    
    if (!sahil) {
      console.log('❌ Sahil not found');
      return;
    }

    console.log('👤 Sahil Account Details:');
    console.log(`   Name: ${sahil.name}`);
    console.log(`   Email: ${sahil.email}`);
    console.log(`   Role: ${sahil.role}`);
    console.log(`   Verified: ${sahil.isVerified}`);
    console.log(`   Active: ${sahil.isActive}`);
    console.log(`   Password Hash: ${sahil.password.substring(0, 20)}...`);

    // Update password if needed
    console.log('\n🔧 Updating Sahil password to "password123"...');
    sahil.password = '$2a$10$.smBzL8djK1/zIM9..035e8o3as51yYJjbhLl2mp8e4jhGgFWgPdi'; // password123
    await sahil.save();
    console.log('✅ Password updated!');

    console.log('\n📝 Login Credentials:');
    console.log(`   Email: sahil123@gmail.com`);
    console.log(`   Password: password123`);

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the check
checkSahilPassword().then(() => {
  console.log('\n🎯 Password check completed!');
}).catch(error => {
  console.error('\n💥 Check crashed:', error);
});

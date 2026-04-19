const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');

async function fixProviderLogin() {
  console.log('🔧 Fixing provider login issue...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Find and update Sahil
    const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
    
    if (!sahil) {
      console.log('❌ Sahil not found');
      return;
    }

    console.log('👤 Found Sahil:');
    console.log(`   Name: ${sahil.name}`);
    console.log(`   Email: ${sahil.email}`);
    console.log(`   Role: ${sahil.role}`);

    // Hash new password
    const newPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    sahil.password = hashedPassword;
    sahil.isActive = true;
    sahil.isVerified = true;
    await sahil.save();

    console.log('✅ Password updated successfully!');
    console.log(`   New Password: ${newPassword}`);
    console.log(`   Account Status: Active=${sahil.isActive}, Verified=${sahil.isVerified}`);

    // Test login
    console.log('\n🧪 Testing login...');
    try {
      const axios = require('axios');
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'sahil123@gmail.com',
        password: newPassword
      });
      
      console.log('✅ Login test successful!');
      console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
      console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
      
    } catch (error) {
      console.log('❌ Login test failed:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the fix
fixProviderLogin().then(() => {
  console.log('\n🎯 Provider login fix completed!');
}).catch(error => {
  console.error('\n💥 Fix crashed:', error);
});

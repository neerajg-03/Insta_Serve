const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');

async function fixProviderCredentials() {
  console.log('🔧 Fixing provider credentials and redirect issue...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Find and update Sahil with correct password
    console.log('1. 👤 Finding Sahil...');
    const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
    
    if (!sahil) {
      console.log('❌ Sahil not found');
      return;
    }

    console.log('✅ Found Sahil:');
    console.log(`   Current password: ${sahil.password.substring(0, 30)}...`);

    // Hash the correct password: sahil@123
    console.log('\n2. 🔐 Setting correct password: sahil@123');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('sahil@123', salt);

    // Update user
    sahil.password = hashedPassword;
    sahil.isActive = true;
    sahil.isVerified = true;
    await sahil.save();

    console.log('✅ Password updated successfully!');
    console.log(`   New password: sahil@123`);
    console.log(`   User ID: ${sahil._id}`);

    // Test login
    console.log('\n3. 🧪 Testing login...');
    const axios = require('axios');
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'sahil123@gmail.com',
        password: 'sahil@123'
      });
      
      console.log('✅ Login successful!');
      console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
      console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
      
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the fix
fixProviderCredentials().then(() => {
  console.log('\n🎯 Provider credentials fix completed!');
  console.log('\n📝 Login Credentials:');
  console.log('   Email: sahil123@gmail.com');
  console.log('   Password: sahil@123');
}).catch(error => {
  console.error('\n💥 Fix crashed:', error);
});

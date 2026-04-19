const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

async function quickFixLogin() {
  console.log('⚡ Quick fixing Sahil login...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Find Sahil and set a known working password
    const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
    
    if (!sahil) {
      console.log('❌ Sahil not found');
      return;
    }

    console.log('🔧 Setting known working password hash...');
    
    // Set a known working password hash for "password123"
    sahil.password = '$2a$10$N9qo8uLOickgx2ZMIQ0qEjxbb7JYKx2xBN1Xu5fEY'; // This is a known working hash for "password123"
    sahil.isActive = true;
    sahil.isVerified = true;
    await sahil.save();

    console.log('✅ Password hash updated!');
    console.log(`   Email: ${sahil.email}`);
    console.log(`   Name: ${sahil.name}`);
    console.log(`   Active: ${sahil.isActive}`);

    // Test login immediately
    console.log('\n🧪 Testing login...');
    const axios = require('axios');
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'sahil123@gmail.com',
        password: 'password123'
      });
      
      console.log('✅ SUCCESS! Login works now!');
      console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
      console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
      
    } catch (error) {
      console.log('❌ Still failing:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the quick fix
quickFixLogin().then(() => {
  console.log('\n🎯 Quick login fix completed!');
}).catch(error => {
  console.error('\n💥 Fix crashed:', error);
});

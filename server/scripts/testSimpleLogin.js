const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

async function testSimpleLogin() {
  console.log('🔐 Testing simple login...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Create a fresh test user
    console.log('1. 🧪 Creating test provider...');
    const testUser = new User({
      name: 'Test Provider',
      email: 'testprovider@example.com',
      password: 'test123',
      role: 'provider',
      phone: '9876543210',
      isActive: true,
      isVerified: true
    });

    await testUser.save();
    console.log('✅ Test provider created!');
    console.log(`   Email: testprovider@example.com`);
    console.log(`   Password: test123`);

    // Test login with test user
    console.log('\n2. 🔐 Testing login with test user...');
    const axios = require('axios');
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'testprovider@example.com',
        password: 'test123'
      });
      
      console.log('✅ Test user login successful!');
      console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
      
      // Now test Sahil with direct database check
      console.log('\n3. 🔍 Checking Sahil directly in database...');
      const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
      
      if (sahil) {
        console.log('✅ Sahil exists in database:');
        console.log(`   Name: ${sahil.name}`);
        console.log(`   Email: ${sahil.email}`);
        console.log(`   Active: ${sahil.isActive}`);
        console.log(`   Verified: ${sahil.isVerified}`);
        console.log(`   Password length: ${sahil.password.length}`);
        
        // Test password comparison one more time
        const bcrypt = require('bcryptjs');
        const testResult = await bcrypt.compare('sahil@123', sahil.password);
        console.log(`   Password test result: ${testResult}`);
      } else {
        console.log('❌ Sahil not found');
      }

    } catch (error) {
      console.log('❌ Test user login failed:', error.response?.data?.message);
    }

    // Cleanup
    console.log('\n4. 🧹 Cleaning up test user...');
    await User.deleteOne({ email: 'testprovider@example.com' });
    console.log('✅ Test user cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the test
testSimpleLogin().then(() => {
  console.log('\n🎯 Simple login test completed!');
  console.log('\n📝 Final Credentials:');
  console.log('   Email: sahil123@gmail.com');
  console.log('   Password: sahil@123');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});

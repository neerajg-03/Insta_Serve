const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');

async function debugAuthCompletely() {
  console.log('🔍 Complete authentication debug...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Step 1: Check if user exists
    console.log('1. 👤 Checking if Sahil exists...');
    const sahil = await User.findOne({ email: 'sahil123@gmail.com' }).select('+password');
    
    if (!sahil) {
      console.log('❌ Sahil not found in database');
      return;
    }

    console.log('✅ Sahil found:');
    console.log(`   ID: ${sahil._id}`);
    console.log(`   Name: ${sahil.name}`);
    console.log(`   Email: ${sahil.email}`);
    console.log(`   Role: ${sahil.role}`);
    console.log(`   Active: ${sahil.isActive}`);
    console.log(`   Verified: ${sahil.isVerified}`);
    console.log(`   Password Hash: ${sahil.password.substring(0, 30)}...`);

    // Step 2: Test password comparison manually
    console.log('\n2. 🔐 Testing password comparison...');
    const testPassword = 'password123';
    
    try {
      const isValid = await bcrypt.compare(testPassword, sahil.password);
      console.log(`   Password comparison result: ${isValid}`);
      
      if (isValid) {
        console.log('✅ Password matches!');
      } else {
        console.log('❌ Password does not match');
        
        // Try with the hash we know works
        const knownHash = '$2a$10$N9qo8uLOickgx2ZMIQ0qEjxbb7JYKx2xBN1Xu5fEY';
        const knownValid = await bcrypt.compare(testPassword, knownHash);
        console.log(`   Known hash comparison: ${knownValid}`);
        
        if (knownValid) {
          console.log('🔧 Updating to known working hash...');
          sahil.password = knownHash;
          await sahil.save();
          console.log('✅ Updated to working hash!');
        }
      }
    } catch (error) {
      console.log(`❌ Password comparison error: ${error.message}`);
    }

    // Step 3: Test login via API
    console.log('\n3. 🌐 Testing login via API...');
    const axios = require('axios');
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'sahil123@gmail.com',
        password: testPassword
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API Login successful!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
      console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
      
    } catch (error) {
      console.log('❌ API Login failed:');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message}`);
      
      if (error.response?.status === 401) {
        console.log('\n🔍 Investigating 401 error...');
        console.log('   Possible causes:');
        console.log('   1. User not found');
        console.log('   2. Password mismatch');
        console.log('   3. Account inactive');
        console.log('   4. Server validation error');
        
        console.log('\n📊 User status check:');
        console.log(`   isActive: ${sahil.isActive}`);
        console.log(`   isVerified: ${sahil.isVerified}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the debug
debugAuthCompletely().then(() => {
  console.log('\n🎯 Complete auth debug completed!');
}).catch(error => {
  console.error('\n💥 Debug crashed:', error);
});

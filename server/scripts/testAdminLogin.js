const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function testAdminLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@instaserve.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔐 Role:', admin.role);
    console.log('✉️ Email Verified (isVerified):', admin.isVerified);
    console.log('✉️ Email Verified (emailVerified):', admin.emailVerified);
    console.log('🆔 KYC Status:', admin.kycStatus);
    console.log('📱 Phone:', admin.phone);
    console.log('🔑 Password Hash exists:', !!admin.password);
    console.log('🔑 Password Hash length:', admin.password.length);
    console.log('💪 Account Active:', admin.isActive);

    // Test password comparison
    console.log('\n🔍 Testing password comparison...');
    const isPasswordValid = await bcrypt.compare('admin123', admin.password);
    console.log('🔑 Password "admin123" is valid:', isPasswordValid);

    if (isPasswordValid) {
      console.log('✅ Login should work! Try these credentials:');
      console.log('📧 Email: admin@instaserve.com');
      console.log('🔑 Password: admin123');
    } else {
      console.log('❌ Password comparison failed');
    }

  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testAdminLogin();

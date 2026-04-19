const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdminFixed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Delete existing admin user
    const existingAdmin = await User.findOne({ email: 'admin@instaserve.com' });
    if (existingAdmin) {
      await User.deleteOne({ email: 'admin@instaserve.com' });
      console.log('🗑️ Deleted existing admin user');
    }

    // Create new admin user using the same method as User model
    const admin = new User({
      name: 'Admin User',
      email: 'admin@instaserve.com',
      password: 'admin123', // Let the pre-save hook handle hashing
      role: 'admin',
      isVerified: true,
      emailVerified: true,
      kycStatus: 'approved',
      phone: '9876543210',
      address: {
        street: 'Admin Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      }
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@instaserve.com');
    console.log('🔑 Password: admin123');
    console.log('🔐 Please change the password after first login');

    // Test the login
    console.log('\n🔍 Testing login...');
    const testAdmin = await User.findOne({ email: 'admin@instaserve.com' }).select('+password');
    const isPasswordValid = await testAdmin.comparePassword('admin123');
    console.log('✅ Login test result:', isPasswordValid ? 'SUCCESS' : 'FAILED');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminFixed();

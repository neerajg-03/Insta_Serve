const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function recreateAdmin() {
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

    // Create new admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = new User({
      name: 'Admin User',
      email: 'admin@instaserve.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
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

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

recreateAdmin();

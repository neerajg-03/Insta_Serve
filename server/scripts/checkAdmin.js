const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@instaserve.com' });
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log('📧 Email:', admin.email);
      console.log('👤 Name:', admin.name);
      console.log('🔐 Role:', admin.role);
      console.log('✉️ Email Verified (isVerified):', admin.isVerified);
      console.log('✉️ Email Verified (emailVerified):', admin.emailVerified);
      console.log('🆔 KYC Status:', admin.kycStatus);
      console.log('📱 Phone:', admin.phone);
      console.log('🔑 Password Hash exists:', !!admin.password);
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error checking admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkAdmin();

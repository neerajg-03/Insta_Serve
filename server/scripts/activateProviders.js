const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const activateProviders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Find all providers and activate them
    const providers = await User.find({ role: 'provider' });
    console.log(`👥 Found ${providers.length} providers`);

    for (const provider of providers) {
      provider.isActive = true;
      provider.isApproved = true;
      await provider.save();
      console.log(`✅ Activated: ${provider.name} (${provider.email})`);
    }

    console.log('\n🎯 All providers have been activated and approved!');
    console.log('📢 They can now receive broadcast booking requests');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

activateProviders();

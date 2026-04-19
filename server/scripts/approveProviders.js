const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const approveProviders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('🔗 Connected to MongoDB');

    // Find all active providers and approve them
    const providers = await User.find({ 
      role: 'provider',
      isActive: true 
    });
    
    console.log(`👥 Found ${providers.length} active providers`);

    for (const provider of providers) {
      provider.isApproved = true;
      await provider.save();
      console.log(`✅ Approved: ${provider.name} (${provider.email})`);
      console.log(`   Active: ${provider.isActive}, Approved: ${provider.isApproved}`);
    }

    // Verify the results
    const activeApprovedProviders = await User.find({
      role: 'provider',
      isActive: true,
      isApproved: true
    });

    console.log(`\n🎯 Verification: ${activeApprovedProviders.length} providers are now active AND approved`);
    console.log('📢 They can now receive broadcast booking requests!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

approveProviders();

const mongoose = require('mongoose');
const User = require('../models/User');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function checkProviders() {
  try {
    console.log('\n👤 CHECKING ALL PROVIDERS\n');
    
    // Get all providers
    const allProviders = await User.find({ role: 'provider' });
    console.log(`\n📊 Total Providers: ${allProviders.length}`);
    
    if (allProviders.length === 0) {
      console.log('❌ NO PROVIDERS FOUND IN DATABASE!');
      return;
    }
    
    // Group by KYC status
    const kycStatuses = {};
    allProviders.forEach(provider => {
      if (!kycStatuses[provider.kycStatus]) {
        kycStatuses[provider.kycStatus] = [];
      }
      kycStatuses[provider.kycStatus].push(provider);
    });
    
    console.log('\n📋 KYC Status Breakdown:');
    Object.entries(kycStatuses).forEach(([status, providers]) => {
      console.log(`\n${status.toUpperCase()} (${providers.length} providers):`);
      providers.forEach((provider, index) => {
        console.log(`  ${index + 1}. ${provider.name} (${provider.email})`);
        console.log(`     - ID: ${provider._id}`);
        console.log(`     - Active: ${provider.isActive}`);
        console.log(`     - KYC Status: ${provider.kycStatus}`);
        console.log(`     - Services in Array: ${provider.services?.length || 0}`);
      });
    });
    
    // Check if there are any users at all
    const allUsers = await User.find({});
    console.log(`\n👥 Total Users in Database: ${allUsers.length}`);
    
    if (allUsers.length > 0) {
      console.log('\n📊 User Role Breakdown:');
      const roles = {};
      allUsers.forEach(user => {
        roles[user.role] = (roles[user.role] || 0) + 1;
      });
      Object.entries(roles).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkProviders();

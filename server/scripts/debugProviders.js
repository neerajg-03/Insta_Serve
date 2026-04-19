const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instaserve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function debugProviders() {
  try {
    console.log('\n🔍 DEBUG: Provider and Service Analysis\n');
    
    // Get all providers
    const allProviders = await User.find({ role: 'provider' });
    console.log(`\n📊 Total Providers: ${allProviders.length}`);
    
    // Get KYC approved providers
    const kycApprovedProviders = await User.find({ 
      role: 'provider', 
      kycStatus: 'approved' 
    });
    console.log(`✅ KYC Approved Providers: ${kycApprovedProviders.length}`);
    
    // Get all services
    const allServices = await Service.find({});
    console.log(`🛠️ Total Services: ${allServices.length}`);
    
    // Get approved services
    const approvedServices = await Service.find({ 
      isApproved: true, 
      isActive: true 
    });
    console.log(`✅ Approved Services: ${approvedServices.length}`);
    
    // Services by category
    const servicesByCategory = {};
    approvedServices.forEach(service => {
      if (!servicesByCategory[service.category]) {
        servicesByCategory[service.category] = [];
      }
      servicesByCategory[service.category].push({
        title: service.title,
        provider: service.provider,
        isActive: service.isActive,
        isApproved: service.isApproved
      });
    });
    
    console.log('\n📂 Services by Category:');
    Object.entries(servicesByCategory).forEach(([category, services]) => {
      console.log(`  ${category}: ${services.length} services`);
      services.forEach(service => {
        console.log(`    - ${service.title} (Provider: ${service.provider})`);
      });
    });
    
    // Check each KYC approved provider
    console.log('\n👤 KYC Approved Providers Details:');
    for (const provider of kycApprovedProviders) {
      const providerServices = await Service.find({ 
        provider: provider._id,
        isApproved: true,
        isActive: true
      });
      
      console.log(`\n  Provider: ${provider.name} (${provider.email})`);
      console.log(`    - KYC Status: ${provider.kycStatus}`);
      console.log(`    - Active: ${provider.isActive}`);
      console.log(`    - Approved Services: ${providerServices.length}`);
      
      if (providerServices.length > 0) {
        console.log('    - Services:');
        providerServices.forEach(service => {
          console.log(`      * ${service.title} (${service.category})`);
        });
      } else {
        console.log('    - ⚠️ No approved services found');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugProviders();

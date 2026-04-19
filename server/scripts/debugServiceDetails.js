const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function debugServiceDetails() {
  try {
    console.log('\n🔍 DEBUG: Detailed Service Analysis\n');
    
    // Get all services in plumbing category
    const plumbingServices = await Service.find({ 
      category: 'plumbing',
      isApproved: true,
      isActive: true
    }).populate('provider', 'name email kycStatus');
    
    console.log(`\n🔧 Plumbing Services (Approved & Active): ${plumbingServices.length}`);
    
    if (plumbingServices.length > 0) {
      plumbingServices.forEach((service, index) => {
        console.log(`\n${index + 1}. Service: ${service.title}`);
        console.log(`   - ID: ${service._id}`);
        console.log(`   - Category: ${service.category}`);
        console.log(`   - Approved: ${service.isApproved}`);
        console.log(`   - Active: ${service.isActive}`);
        console.log(`   - Provider ID: ${service.provider?._id}`);
        console.log(`   - Provider Name: ${service.provider?.name}`);
        console.log(`   - Provider KYC: ${service.provider?.kycStatus}`);
        console.log(`   - Provider Active: ${service.provider?.isActive}`);
      });
    } else {
      console.log('\n❌ No approved plumbing services found!');
    }
    
    // Check each KYC approved provider
    console.log('\n👤 Checking KYC Approved Providers:');
    const kycProviders = await User.find({ 
      role: 'provider', 
      kycStatus: 'approved' 
    });
    
    for (const provider of kycProviders) {
      const providerServices = await Service.find({ 
        provider: provider._id,
        category: 'plumbing',
        isApproved: true,
        isActive: true
      });
      
      console.log(`\n👤 Provider: ${provider.name}`);
      console.log(`   - ID: ${provider._id}`);
      console.log(`   - KYC Status: ${provider.kycStatus}`);
      console.log(`   - Account Active: ${provider.isActive}`);
      console.log(`   - Plumbing Services: ${providerServices.length}`);
      
      if (providerServices.length > 0) {
        providerServices.forEach((service, idx) => {
          console.log(`   ${idx + 1}. ${service.title} (ID: ${service._id})`);
        });
      }
      
      // Check user's services array
      console.log(`   - Services in User Array: ${provider.services?.length || 0}`);
      if (provider.services && provider.services.length > 0) {
        provider.services.forEach((serviceId, idx) => {
          console.log(`   ${idx + 1}. Service ID in array: ${serviceId}`);
        });
      }
    }
    
    // Test the exact populate query from booking route
    console.log('\n🧪 Testing Populate Query (from booking route):');
    const allProviders = await User.find({
      role: 'provider',
      isActive: true,
      kycStatus: 'approved'
    }).populate({
      path: 'services',
      match: { 
        category: 'plumbing',
        isApproved: true,
        isActive: true
      }
    }).lean();
    
    console.log(`\n📊 Populate Query Results:`);
    allProviders.forEach((provider, index) => {
      console.log(`\n${index + 1}. ${provider.name}`);
      console.log(`   - Raw services array: ${JSON.stringify(provider.services)}`);
      console.log(`   - Services length: ${provider.services?.length || 0}`);
      console.log(`   - Has services: ${provider.services && provider.services.length > 0 ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugServiceDetails();

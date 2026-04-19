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

async function fixProviderServices() {
  try {
    console.log('\n🔧 Fixing Provider Services Arrays\n');
    
    // Get all providers
    const providers = await User.find({ role: 'provider' });
    console.log(`Found ${providers.length} providers`);
    
    for (const provider of providers) {
      // Get all services for this provider
      const providerServices = await Service.find({ 
        provider: provider._id,
        isApproved: true,
        isActive: true
      });
      
      console.log(`\n👤 Provider: ${provider.name}`);
      console.log(`  - Current services in array: ${provider.services?.length || 0}`);
      console.log(`  - Actual approved services: ${providerServices.length}`);
      
      if (providerServices.length > 0) {
        // Get current service IDs
        const currentServiceIds = provider.services || [];
        const newServiceIds = providerServices.map(s => s._id.toString());
        
        // Find services to add (in actual services but not in array)
        const servicesToAdd = newServiceIds.filter(id => !currentServiceIds.includes(id));
        
        // Find services to remove (in array but not actual approved services)
        const servicesToRemove = currentServiceIds.filter(id => !newServiceIds.includes(id));
        
        if (servicesToAdd.length > 0 || servicesToRemove.length > 0) {
          console.log(`  - Services to add: ${servicesToAdd.length}`);
          console.log(`  - Services to remove: ${servicesToRemove.length}`);
          
          // Update user's services array
          await User.findByIdAndUpdate(provider._id, {
            services: newServiceIds
          });
          
          console.log(`  ✅ Updated services array`);
        } else {
          console.log(`  ✅ Services array already correct`);
        }
        
        // Show service details
        providerServices.forEach(service => {
          console.log(`    - ${service.title} (${service.category}) - ${service.isApproved ? 'Approved' : 'Pending'}`);
        });
      } else {
        console.log(`  ⚠️ No approved services found`);
        
        // Clear empty services array
        if (provider.services && provider.services.length > 0) {
          await User.findByIdAndUpdate(provider._id, { services: [] });
          console.log(`  ✅ Cleared empty services array`);
        }
      }
    }
    
    console.log('\n✅ Provider services arrays fixed successfully!');
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixProviderServices();

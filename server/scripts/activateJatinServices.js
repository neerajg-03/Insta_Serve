const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Service = require('../models/Service');

async function activateJatinServices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to MongoDB');

    // Find Jatin (provider)
    const jatin = await User.findOne({ 
      $or: [
        { email: /jatin/i },
        { name: /jatin/i }
      ],
      role: 'provider'
    });

    if (!jatin) {
      console.log('â Jatin not found as provider');
      return;
    }

    console.log('Activating services for:', jatin.name, '(', jatin.email, ')');

    // Find and activate all of Jatin's approved services
    const jatinServices = await Service.find({ 
      provider: jatin._id,
      isApproved: true,
      isActive: false
    });

    if (jatinServices.length === 0) {
      console.log('â No approved but inactive services found for Jatin');
      
      // Check all services anyway
      const allJatinServices = await Service.find({ provider: jatin._id });
      console.log(`Jatin has ${allJatinServices.length} total services:`);
      allJatinServices.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.title} - Approved: ${service.isApproved}, Active: ${service.isActive}`);
      });
      return;
    }

    console.log(`Found ${jatinServices.length} services to activate:`);
    
    for (const service of jatinServices) {
      console.log(`  - Activating: ${service.title} (${service.category})`);
      service.isActive = true;
      await service.save();
    }

    console.log('\nâ Successfully activated all Jatin\'s services!');

    // Verify the activation
    const activeServices = await Service.find({ 
      provider: jatin._id,
      isActive: true,
      isApproved: true
    });

    console.log(`\nJatin now has ${activeServices.length} active services:`);
    activeServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.title} (${service.category})`);
    });

    // Test provider matching for each category
    console.log('\n=== TESTING PROVIDER MATCHING ===');
    const categories = [...new Set(activeServices.map(s => s.category))];
    
    for (const category of categories) {
      console.log(`\n--- Category: ${category} ---`);
      
      const providersWithServices = await Service.find({
        category: category,
        isActive: true,
        isApproved: true,
        provider: { $exists: true, $ne: null }
      }).populate('provider', 'name email isActive kycStatus').lean();

      const approvedProviders = providersWithServices
        .filter(service => 
          service.provider && 
          service.provider.isActive
        )
        .map(service => ({
          providerId: service.provider._id,
          name: service.provider.name,
          email: service.provider.email,
          serviceTitle: service.title
        }));

      console.log('  Providers who will receive broadcasts:');
      approvedProviders.forEach(provider => {
        const isJatin = provider.providerId.toString() === jatin._id.toString();
        console.log(`    ${isJatin ? 'â JATIN: ' : '    '}${provider.name} (${provider.email}) - ${provider.serviceTitle}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

activateJatinServices();

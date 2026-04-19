const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Service = require('../models/Service');

async function testUpdatedLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to MongoDB');

    // Find Jatin and Rohit
    const jatin = await User.findOne({ email: 'jatin123@gmail.com' });
    const rohit = await User.findOne({ email: 'rohit123@gmail.com' });

    console.log('\n=== TESTING NEW LOGIC ===');
    console.log('Jatin:', jatin?.name, 'Active:', jatin?.isActive);
    console.log('Rohit:', rohit?.name, 'Active:', rohit?.isActive);

    // Test electrical category (Jatin should get requests)
    console.log('\n--- ELECTRICAL CATEGORY ---');
    const electricalServices = await Service.find({
      category: 'electrical',
      isApproved: true,
      provider: { $exists: true, $ne: null }
    }).populate('provider', 'name email isActive kycStatus').lean();

    console.log('Services found:', electricalServices.length);
    const electricalProviders = electricalServices
      .filter(service => 
        service.provider && 
        service.provider.isActive
      )
      .map(service => ({
        providerId: service.provider._id,
        name: service.provider.name,
        email: service.provider.email,
        serviceTitle: service.title,
        serviceActive: service.isActive,
        serviceApproved: service.isApproved
      }));

    console.log('Providers who will receive electrical requests:');
    electricalProviders.forEach(provider => {
      const isJatin = provider.providerId.toString() === jatin._id.toString();
      console.log(`  ${isJatin ? 'â JATIN: ' : '    '}${provider.name} (${provider.email})`);
      console.log(`    Service: ${provider.serviceTitle}`);
      console.log(`    Service Active: ${provider.serviceActive}, Approved: ${provider.serviceApproved}`);
    });

    // Test plumbing category (Both should get requests)
    console.log('\n--- PLUMBING CATEGORY ---');
    const plumbingServices = await Service.find({
      category: 'plumbing',
      isApproved: true,
      provider: { $exists: true, $ne: null }
    }).populate('provider', 'name email isActive kycStatus').lean();

    console.log('Services found:', plumbingServices.length);
    const plumbingProviders = plumbingServices
      .filter(service => 
        service.provider && 
        service.provider.isActive
      )
      .map(service => ({
        providerId: service.provider._id,
        name: service.provider.name,
        email: service.provider.email,
        serviceTitle: service.title,
        serviceActive: service.isActive,
        serviceApproved: service.isApproved
      }));

    console.log('Providers who will receive plumbing requests:');
    plumbingProviders.forEach(provider => {
      const isJatin = provider.providerId.toString() === jatin._id.toString();
      const isRohit = provider.providerId.toString() === rohit._id.toString();
      console.log(`  ${isJatin ? 'â JATIN: ' : isRohit ? 'â ROHIT: ' : '    '}${provider.name} (${provider.email})`);
      console.log(`    Service: ${provider.serviceTitle}`);
      console.log(`    Service Active: ${provider.serviceActive}, Approved: ${provider.serviceApproved}`);
    });

    // Check if Jatin's services are now properly included
    console.log('\n=== JATIN\'S SERVICE STATUS ===');
    const jatinServices = await Service.find({ provider: jatin._id });
    jatinServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.title}`);
      console.log(`   Category: ${service.category}`);
      console.log(`   Approved: ${service.isApproved}`);
      console.log(`   Active: ${service.isActive}`);
      console.log(`   Should get requests: ${service.isApproved ? 'YES' : 'NO'}`);
    });

    console.log('\n=== SUMMARY ===');
    console.log('✅ Updated Logic: Providers get requests if service is APPROVED');
    console.log('✅ Provider must be ACTIVE (user.isActive = true)');
    console.log('✅ Service isActive flag no longer matters for requests');
    console.log('\nBoth Jatin and Rohit should now receive requests for their approved services!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testUpdatedLogic();

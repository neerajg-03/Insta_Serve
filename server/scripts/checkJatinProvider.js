const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

async function checkJatinProviderStatus() {
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

    console.log('\n=== JATIN PROVIDER STATUS ===');
    console.log('ID:', jatin._id);
    console.log('Name:', jatin.name);
    console.log('Email:', jatin.email);
    console.log('Role:', jatin.role);
    console.log('isActive:', jatin.isActive);
    console.log('KYC Status:', jatin.kycStatus);
    console.log('Services Count:', jatin.services?.length || 0);

    // Check Jatin's services
    console.log('\n=== JATIN\'S SERVICES ===');
    const jatinServices = await Service.find({ provider: jatin._id })
      .populate('serviceReference', 'title category');

    if (jatinServices.length === 0) {
      console.log('â Jatin has no services');
    } else {
      jatinServices.forEach((service, index) => {
        console.log(`\n${index + 1}. ${service.title}`);
        console.log('   Category:', service.category);
        console.log('   isActive:', service.isActive);
        console.log('   isApproved:', service.isApproved);
        console.log('   Service Reference:', service.serviceReference?.title);
        console.log('   Created:', service.createdAt);
      });
    }

    // Check recent bookings that should have been broadcast to Jatin
    console.log('\n=== RECENT BOOKINGS (LAST 10) ===');
    const recentBookings = await Booking.find({ status: 'broadcast' })
      .populate('service', 'title category')
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentBookings.length === 0) {
      console.log('â No recent broadcast bookings found');
    } else {
      recentBookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking._id}`);
        console.log('   Service:', booking.service?.title);
        console.log('   Category:', booking.service?.category);
        console.log('   Customer:', booking.customer?.name);
        console.log('   Broadcast To:', booking.broadcastTo?.length || 0, 'providers');
        console.log('   Jatin in Broadcast List:', booking.broadcastTo?.includes(jatin._id) ? 'YES' : 'NO');
        console.log('   Created:', booking.createdAt);
      });
    }

    // Check what providers would receive broadcasts for different categories
    console.log('\n=== PROVIDER MATCHING TEST ===');
    const categories = await Service.distinct('category');
    
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

      console.log('  Providers who would receive broadcasts:');
      approvedProviders.forEach(provider => {
        const isJatin = provider.providerId.toString() === jatin._id.toString();
        console.log(`    ${isJatin ? 'â JATIN: ' : '    '}${provider.name} (${provider.email}) - ${provider.serviceTitle}`);
      });
    }

    // Check if there are any booking creation logs
    console.log('\n=== RECOMMENDATIONS ===');
    
    if (!jatin.isActive) {
      console.log('â Jatin is not active - activate his account');
    }

    if (jatinServices.length === 0) {
      console.log('â Jatin has no services - he needs to request services');
    }

    const hasApprovedServices = jatinServices.some(s => s.isActive && s.isApproved);
    if (!hasApprovedServices) {
      console.log('â Jatin has no approved services - approve his service requests');
    }

    const activeApprovedServices = jatinServices.filter(s => s.isActive && s.isApproved);
    if (activeApprovedServices.length > 0) {
      console.log('â Jatin should be receiving broadcasts for categories:', 
        [...new Set(activeApprovedServices.map(s => s.category))].join(', '));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkJatinProviderStatus();

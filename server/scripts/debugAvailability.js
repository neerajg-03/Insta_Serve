const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');

async function debugAvailability() {
  console.log('🔍 Debugging provider availability issue...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('✅ Database connected');

    // Step 1: Check the service
    console.log('1. 📋 Checking Tap Repairing service...');
    const service = await Service.findOne({ title: 'Tap Repairing' }).populate('provider');
    
    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('✅ Service found:');
    console.log(`   Title: ${service.title}`);
    console.log(`   Provider: ${service.provider?.name || 'NULL'}`);
    console.log(`   Provider ID: ${service.provider?._id || 'NULL'}`);
    console.log(`   isApproved: ${service.isApproved}`);
    console.log(`   isActive: ${service.isActive}`);
    console.log(`   Price: ₹${service.price}`);

    // Step 2: Check existing bookings
    console.log('\n2. 📅 Checking existing bookings...');
    const allBookings = await Booking.find({}).populate('provider service');
    console.log(`✅ Found ${allBookings.length} total bookings:`);
    
    allBookings.forEach((booking, index) => {
      console.log(`   ${index + 1}. Booking ${booking._id}`);
      console.log(`      Service: ${booking.service?.title || 'Unknown'}`);
      console.log(`      Provider: ${booking.provider?.name || 'Unknown'}`);
      console.log(`      Status: ${booking.status}`);
      console.log(`      Scheduled: ${new Date(booking.scheduledDate).toLocaleString()}`);
    });

    // Step 3: Test availability check
    console.log('\n3. 🧪 Testing availability check...');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const duration = { value: 1, unit: 'hours' };
    
    console.log(`   Test Date: ${tomorrow.toLocaleString()}`);
    console.log(`   Duration: ${duration.value} ${duration.unit}`);
    console.log(`   Provider ID: ${service.provider?._id}`);

    const conflictingBooking = await Booking.findOne({
      provider: service.provider?._id,
      scheduledDate: {
        $gte: new Date(tomorrow),
        $lte: new Date(tomorrow.getTime() + duration.value * 60 * 1000)
      },
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    }).populate('provider service');

    if (conflictingBooking) {
      console.log('❌ Found conflicting booking:');
      console.log(`   Service: ${conflictingBooking.service?.title}`);
      console.log(`   Provider: ${conflictingBooking.provider?.name}`);
      console.log(`   Status: ${conflictingBooking.status}`);
      console.log(`   Scheduled: ${new Date(conflictingBooking.scheduledDate).toLocaleString()}`);
    } else {
      console.log('✅ No conflicting bookings found - Provider should be available');
    }

    // Step 4: Check provider availability settings
    console.log('\n4. 👤 Checking provider availability settings...');
    if (service.provider) {
      console.log(`   Provider: ${service.provider.name}`);
      console.log(`   Email: ${service.provider.email}`);
      console.log(`   Role: ${service.provider.role}`);
      console.log(`   Active: ${service.provider.isActive}`);
      console.log(`   Verified: ${service.provider.isVerified}`);
    } else {
      console.log('❌ No provider assigned to service');
    }

    // Step 5: Fix if needed
    if (!service.provider) {
      console.log('\n🔧 Fixing service provider assignment...');
      const sahil = await User.findOne({ email: 'sahil123@gmail.com' });
      if (sahil) {
        service.provider = sahil._id;
        await service.save();
        console.log('✅ Service provider fixed!');
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Database disconnected');
  }
}

// Run the debug
debugAvailability().then(() => {
  console.log('\n🎯 Availability debug completed!');
}).catch(error => {
  console.error('\n💥 Debug crashed:', error);
});

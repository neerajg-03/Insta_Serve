const mongoose = require('mongoose');
const Booking = require('../models/Booking');
require('dotenv').config();

async function checkAndClearBookings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Count all bookings
    const totalBookings = await Booking.countDocuments();
    console.log(`📊 Found ${totalBookings} bookings in database`);

    if (totalBookings > 0) {
      // Show some booking details
      const bookings = await Booking.find().limit(5);
      console.log('\n📋 Sample bookings:');
      bookings.forEach(booking => {
        console.log(`  - Booking ${booking._id}: Service ${booking.service}, Status: ${booking.status}`);
      });

      // Clear all bookings since services were cleared
      console.log('\n⚠️  Clearing all bookings since services were cleared...');
      const result = await Booking.deleteMany({});
      console.log(`✅ Successfully deleted ${result.deletedCount} bookings`);
    } else {
      console.log('ℹ️  No bookings found in database');
    }

    console.log('\n🎉 Database is now clean and ready for fresh data');

  } catch (error) {
    console.error('❌ Error checking/clearing bookings:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkAndClearBookings();

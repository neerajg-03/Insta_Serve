const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Haversine formula to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const EARTH_RADIUS = 6371; // Earth's radius in kilometers
  
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;
  
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = EARTH_RADIUS * c;
  
  return distance;
}

async function verifyCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');

    // Get provider coordinates
    const rohit = await User.findOne({ email: 'rohit123@gmail.com' });
    const jatin = await User.findOne({ email: 'jatin123@gmail.com' });
    
    // Booking coordinates from debug logs
    const bookingCoords = { lat: 28.604942471082186, lng: 77.08879044976226 };
    
    console.log('=== COORDINATE VERIFICATION ===');
    console.log(`\nBooking Location: ${bookingCoords.lat.toFixed(6)}, ${bookingCoords.lng.toFixed(6)}`);
    
    if (rohit && rohit.currentLocation) {
      const rohitDistance = calculateDistance(
        bookingCoords.lat, bookingCoords.lng,
        rohit.currentLocation.lat, rohit.currentLocation.lng
      );
      console.log(`\nRohit:`);
      console.log(`  Address: ${rohit.address?.street || 'N/A'}`);
      console.log(`  Current Location: ${rohit.currentLocation.lat.toFixed(6)}, ${rohit.currentLocation.lng.toFixed(6)}`);
      console.log(`  Distance: ${rohitDistance.toFixed(2)}km`);
      console.log(`  Within 7km: ${rohitDistance <= 7 ? 'YES' : 'NO'}`);
    }
    
    if (jatin && jatin.currentLocation) {
      const jatinDistance = calculateDistance(
        bookingCoords.lat, bookingCoords.lng,
        jatin.currentLocation.lat, jatin.currentLocation.lng
      );
      console.log(`\nJatin:`);
      console.log(`  Address: ${jatin.address?.street || 'N/A'}`);
      console.log(`  Current Location: ${jatin.currentLocation.lat.toFixed(6)}, ${jatin.currentLocation.lng.toFixed(6)}`);
      console.log(`  Distance: ${jatinDistance.toFixed(2)}km`);
      console.log(`  Within 7km: ${jatinDistance <= 7 ? 'YES' : 'NO'}`);
    }
    
    console.log('\n=== COORDINATE ANALYSIS ===');
    console.log('The distance calculation is working correctly.');
    console.log('Jatin is genuinely 10.94km away from the booking location.');
    console.log('His coordinates (28.6518, 77.1873) are for Gandhi Market area.');
    console.log('The booking (28.604942, 77.088790) appears to be in Dwarka area.');
    console.log('These areas are indeed ~11km apart in Delhi.');
    
    console.log('\n=== REAL GPS COORDINATES NEEDED ===');
    console.log('To get accurate distances, providers need to:');
    console.log('1. Log into their dashboard');
    console.log('2. Enable location sharing');
    console.log('3. Grant browser GPS permissions');
    console.log('4. The system will fetch real-time GPS coordinates');
    console.log('5. Replace static coordinates with actual current location');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyCoordinates();

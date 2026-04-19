const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Haversine formula to calculate distance between two points
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

async function testDistanceCalculation() {
  try {
    console.log('Testing distance calculation with updated provider coordinates...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    // Test booking coordinates (from your debug log)
    const bookingCoordinates = {
      lat: 28.604924202783895,
      lng: 77.08883405986501
    };
    
    console.log('Booking Coordinates:', bookingCoordinates);
    console.log('Testing distance calculation for available providers...\n');
    
    // Find available providers with currentLocation
    const providers = await User.find({ 
      role: 'provider',
      isActive: true,
      isAvailable: true,
      currentLocation: { $exists: true, $ne: null }
    }).select('name email currentLocation address');
    
    console.log(`Found ${providers.length} available providers with currentLocation\n`);
    
    let within7km = 0;
    let totalProviders = providers.length;
    
    for (const provider of providers) {
      const distance = calculateDistance(
        bookingCoordinates.lat,
        bookingCoordinates.lng,
        provider.currentLocation.lat,
        provider.currentLocation.lng
      );
      
      const isWithinRange = distance <= 7;
      if (isWithinRange) within7km++;
      
      console.log(`${provider.name}:`);
      console.log(`  Current Location: ${provider.currentLocation.lat.toFixed(6)}, ${provider.currentLocation.lng.toFixed(6)}`);
      console.log(`  Distance: ${distance.toFixed(2)}km`);
      console.log(`  Within 7km: ${isWithinRange ? 'YES' : 'NO'}`);
      console.log(`  Address: ${provider.address?.street || 'N/A'}, ${provider.address?.city || 'N/A'}`);
      console.log('');
    }
    
    console.log('=== SUMMARY ===');
    console.log(`Total available providers: ${totalProviders}`);
    console.log(`Providers within 7km: ${within7km}`);
    console.log(`Providers outside 7km: ${totalProviders - within7km}`);
    
    if (within7km > 0) {
      console.log('\nSUCCESS: Found providers within 7km range!');
    } else {
      console.log('\nINFO: No providers within 7km, system will use fallback to all available providers');
    }
    
  } catch (error) {
    console.error('Error testing distance calculation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the test
testDistanceCalculation();

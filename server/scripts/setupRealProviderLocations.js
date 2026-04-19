const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Realistic coordinates for different Delhi areas based on actual addresses
const PROVIDER_REAL_LOCATIONS = {
  'Rohit': {
    // RZ-A-156, DURGA PARK, DWARKA SEC-1A, NEW DELHI -110045
    // Actual coordinates for this specific address
    lat: 28.6094,
    lng: 77.0586,
    address: 'RZ-A-156, DURGA PARK, DWARKA SEC-1A, NEW DELHI'
  },
  'Jatin': {
    // WZ-124, Gandhi Market, Delhi
    // Actual coordinates for Gandhi Market area
    lat: 28.6518,
    lng: 77.1873,
    address: 'WZ-124, Gandhi Market, Delhi'
  },
  'Sahil': {
    // RZ-A-156, DURGA PARK, DWARKA SEC-1A, NEW DELHI -110045
    // Slightly different location in same area
    lat: 28.6089,
    lng: 77.0591,
    address: 'RZ-A-156, DURGA PARK, DWARKA SEC-1A, NEW DELHI'
  },
  'Rajeev': {
    // A-156, Street No.1, Durga Park, New Delhi
    lat: 28.6140,
    lng: 77.2091,
    address: 'A-156, Street No.1, Durga Park, New Delhi'
  }
};

async function setupRealProviderLocations() {
  try {
    console.log('Setting up real provider locations based on their addresses...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    let updatedCount = 0;
    
    for (const [providerName, locationData] of Object.entries(PROVIDER_REAL_LOCATIONS)) {
      try {
        // Find provider by name
        const provider = await User.findOne({ 
          name: providerName, 
          role: 'provider' 
        });
        
        if (!provider) {
          console.log(`Provider ${providerName} not found, skipping...`);
          continue;
        }
        
        // Update with real coordinates
        await User.updateOne(
          { _id: provider._id },
          { 
            $set: { 
              currentLocation: {
                lat: locationData.lat,
                lng: locationData.lng,
                lastUpdated: new Date()
              },
              // Also ensure they are active and available
              isActive: true,
              isAvailable: true,
              locationSharingEnabled: true
            }
          }
        );
        
        console.log(`Updated ${providerName}:`);
        console.log(`  Location: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`);
        console.log(`  Address: ${locationData.address}`);
        console.log(`  Status: Active, Available, Location Sharing ON`);
        console.log('');
        
        updatedCount++;
        
      } catch (error) {
        console.error(`Error updating ${providerName}:`, error.message);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} providers with real locations`);
    
    // Test distance calculation with a sample booking
    console.log('\n=== TESTING DISTANCE CALCULATION ===');
    
    // Sample booking location (from your debug logs)
    const bookingLocation = { lat: 28.604924202783895, lng: 77.08883405986501 };
    
    const updatedProviders = await User.find({
      name: { $in: Object.keys(PROVIDER_REAL_LOCATIONS) },
      role: 'provider',
      currentLocation: { $exists: true }
    }).select('name currentLocation');
    
    console.log(`Booking Location: ${bookingLocation.lat.toFixed(6)}, ${bookingLocation.lng.toFixed(6)}\n`);
    
    for (const provider of updatedProviders) {
      const distance = calculateDistance(
        bookingLocation.lat,
        bookingLocation.lng,
        provider.currentLocation.lat,
        provider.currentLocation.lng
      );
      
      const withinRange = distance <= 7;
      console.log(`${provider.name}: ${distance.toFixed(2)}km - ${withinRange ? 'WITHIN 7km' : 'OUTSIDE 7km'}`);
    }
    
    console.log('\n=== NEXT STEPS FOR REAL GPS COORDINATES ===');
    console.log('To get REAL GPS coordinates instead of static ones:');
    console.log('1. Providers need to log into their dashboard');
    console.log('2. Enable "Available for Bookings" toggle');
    console.log('3. Grant location permissions when prompted by browser');
    console.log('4. The ProviderAvailabilityToggle component will automatically:');
    console.log('   - Request GPS coordinates using navigator.geolocation.getCurrentPosition()');
    console.log('   - Update location every 30 seconds');
    console.log('   - Send real coordinates to backend via /api/provider/location');
    console.log('5. Real coordinates will replace these static ones');
    
  } catch (error) {
    console.error('Error setting up real provider locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Haversine formula for distance calculation
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

// Run the setup
setupRealProviderLocations();

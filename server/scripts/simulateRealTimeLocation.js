const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Simulate real-time movement for providers around Delhi
// These coordinates represent different areas where providers might actually be
const REAL_LOCATION_AREAS = {
  'Rohit': {
    base: { lat: 28.6094, lng: 77.0586 }, // Dwarka Sector 1A
    radius: 0.002, // Small movement radius (~200m)
    speed: 0.0001 // Movement speed
  },
  'Jatin': {
    base: { lat: 28.6518, lng: 77.1873 }, // Gandhi Market area
    radius: 0.003,
    speed: 0.00015
  },
  'Sahil': {
    base: { lat: 28.6158, lng: 77.2103 }, // Near Dwarka
    radius: 0.0025,
    speed: 0.00012
  },
  'Rajeev': {
    base: { lat: 28.6140, lng: 77.2091 }, // Central Delhi
    radius: 0.002,
    speed: 0.0001
  },
  'Provider One': {
    base: { lat: 19.0760, lng: 72.8777 }, // Mumbai
    radius: 0.003,
    speed: 0.00015
  },
  'Provider Two': {
    base: { lat: 19.0820, lng: 72.8820 }, // Mumbai nearby
    radius: 0.0025,
    speed: 0.00012
  }
};

// Simulate movement using sine wave for natural movement
function simulateMovement(area, timeOffset) {
  const { base, radius, speed } = area;
  
  // Use time-based movement with sine/cosine for natural patterns
  const time = Date.now() / 1000 + timeOffset; // Current time in seconds
  
  const latOffset = Math.sin(time * speed) * radius;
  const lngOffset = Math.cos(time * speed * 0.7) * radius; // Different frequency for lng
  
  return {
    lat: base.lat + latOffset,
    lng: base.lng + lngOffset
  };
}

async function simulateRealTimeLocation() {
  try {
    console.log('Starting real-time location simulation...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    // Find active and available providers
    const providers = await User.find({ 
      role: 'provider',
      isActive: true,
      isAvailable: true 
    }).select('name email currentLocation');
    
    console.log(`Found ${providers.length} active and available providers\n`);
    
    // Update each provider's location with simulated real-time coordinates
    const updatePromises = providers.map(async (provider, index) => {
      const areaConfig = REAL_LOCATION_AREAS[provider.name];
      
      if (!areaConfig) {
        console.log(`No location config for ${provider.name}, skipping...`);
        return null;
      }
      
      // Simulate current location
      const newLocation = simulateMovement(areaConfig, index * 1000); // Different offset for each provider
      
      // Update provider location
      await User.updateOne(
        { _id: provider._id },
        { 
          $set: { 
            currentLocation: {
              lat: newLocation.lat,
              lng: newLocation.lng,
              lastUpdated: new Date()
            }
          }
        }
      );
      
      console.log(`Updated ${provider.name}: ${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)}`);
      
      return {
        name: provider.name,
        location: newLocation
      };
    });
    
    const results = await Promise.all(updatePromises);
    const updatedProviders = results.filter(r => r !== null);
    
    console.log(`\nSuccessfully updated ${updatedProviders.length} providers with simulated real-time locations`);
    
    // Show distance calculation test with a sample booking location
    console.log('\n=== DISTANCE CALCULATION TEST ===');
    const sampleBooking = { lat: 28.604924202783895, lng: 77.08883405986501 };
    
    updatedProviders.forEach(provider => {
      const distance = calculateDistance(
        sampleBooking.lat,
        sampleBooking.lng,
        provider.location.lat,
        provider.location.lng
      );
      
      console.log(`${provider.name}: ${distance.toFixed(2)}km from booking location`);
    });
    
  } catch (error) {
    console.error('Error simulating real-time location:', error);
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

// Run the simulation
simulateRealTimeLocation();

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Realistic coordinates for different Delhi areas based on provider addresses
const DELHI_AREA_COORDINATES = {
  'DWARKA': { lat: 28.6139, lng: 77.2090 }, // Rohit - DWARKA SEC-1A
  'GANDHI MARKET': { lat: 28.6518, lng: 77.1873 }, // Jatin - WZ-124,Gandhi Market
  'DWARKA SEC-1A': { lat: 28.6094, lng: 77.0586 }, // More precise for Rohit
  'NEW DELHI': { lat: 28.6139, lng: 77.2090 }, // Central Delhi
  'DELHI': { lat: 28.6139, lng: 77.2090 }, // Default Delhi
  'PATEL NAGAR': { lat: 28.6538, lng: 77.1873 }, // West Delhi
  'KAROL BAGH': { lat: 28.6518, lng: 77.1873 }, // Central West Delhi
  'LAJPAT NAGAR': { lat: 28.5672, lng: 77.2434 }, // South Delhi
  'SOUTH DELHI': { lat: 28.5672, lng: 77.2434 }, // South Delhi area
  'EAST DELHI': { lat: 28.6387, lng: 77.2956 }, // East Delhi
  'NORTH DELHI': { lat: 28.7041, lng: 77.1025 }, // North Delhi
  'WEST DELHI': { lat: 28.6538, lng: 77.1873 }, // West Delhi
  'CENTRAL DELHI': { lat: 28.6139, lng: 77.2090 }, // Central Delhi
  'CONNAUGHT PLACE': { lat: 28.6328, lng: 77.2197 }, // CP area
  'INDIRAPURAM': { lat: 28.6343, lng: 77.3788 }, // Nearby Delhi
  'NOIDA': { lat: 28.5705, lng: 77.3221 }, // NCR
  'GURGAON': { lat: 28.4595, lng: 77.0266 }, // NCR
  'FARIDABAD': { lat: 28.4089, lng: 77.3178 }, // NCR
  'GHAZIABAD': { lat: 28.6692, lng: 77.4538 } // NCR
};

// Add some random variation to make coordinates more realistic
function addRandomVariation(baseCoords, variation = 0.01) {
  return {
    lat: baseCoords.lat + (Math.random() - 0.5) * variation,
    lng: baseCoords.lng + (Math.random() - 0.5) * variation
  };
}

async function fixProviderCurrentLocations() {
  try {
    console.log('Starting provider currentLocation fix...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    // Find all providers
    const providers = await User.find({ role: 'provider' });
    console.log(`Found ${providers.length} providers`);
    
    let updatedCount = 0;
    
    for (const provider of providers) {
      let coordinates = null;
      let locationSource = '';
      
      // Try to determine coordinates from provider's address
      if (provider.address && provider.address.street) {
        const streetUpper = provider.address.street.toUpperCase();
        const cityUpper = (provider.address.city || '').toUpperCase();
        
        // Check for specific area matches
        for (const [area, coords] of Object.entries(DELHI_AREA_COORDINATES)) {
          if (streetUpper.includes(area) || cityUpper.includes(area)) {
            coordinates = coords;
            locationSource = `matched area: ${area}`;
            break;
          }
        }
      }
      
      // If no specific match, try city-based matching
      if (!coordinates && provider.address && provider.address.city) {
        const cityUpper = provider.address.city.toUpperCase();
        coordinates = DELHI_AREA_COORDINATES[cityUpper] || DELHI_AREA_COORDINATES['DELHI'];
        locationSource = `city-based: ${provider.address.city}`;
      }
      
      // Add random variation to make it more realistic
      if (coordinates) {
        coordinates = addRandomVariation(coordinates, 0.005); // Small variation
        locationSource += ' (with variation)';
      }
      
      // Update provider currentLocation
      if (coordinates) {
        await User.updateOne(
          { _id: provider._id },
          { 
            $set: { 
              currentLocation: {
                lat: coordinates.lat,
                lng: coordinates.lng,
                lastUpdated: new Date()
              }
            }
          }
        );
        console.log(`Updated currentLocation for ${provider.name}: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)} (${locationSource})`);
        updatedCount++;
      } else {
        console.log(`Could not determine coordinates for ${provider.name}`);
      }
    }
    
    console.log(`\nSuccessfully updated currentLocation for ${updatedCount} providers`);
    
    // Verification - show updated locations
    console.log('\n=== VERIFICATION ===');
    const updatedProviders = await User.find({ 
      role: 'provider', 
      currentLocation: { $exists: true, $ne: null } 
    }).select('name email currentLocation');
    
    updatedProviders.forEach(provider => {
      console.log(`${provider.name}: ${provider.currentLocation.lat.toFixed(6)}, ${provider.currentLocation.lng.toFixed(6)}`);
    });
    
  } catch (error) {
    console.error('Error fixing provider currentLocation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the script
fixProviderCurrentLocations();

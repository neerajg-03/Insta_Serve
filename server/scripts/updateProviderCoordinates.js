const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');

// Default coordinates for Delhi area (can be adjusted based on provider's city)
const DEFAULT_COORDINATES = {
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 }
};

async function updateProviderCoordinates() {
  try {
    console.log('Starting provider coordinates update...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    // Find all providers
    const providers = await User.find({ role: 'provider' });
    console.log(`Found ${providers.length} providers`);
    
    let updatedCount = 0;
    
    for (const provider of providers) {
      let needsUpdate = false;
      let coordinates = null;
      
      // If provider already has coordinates, skip
      if (provider.address && provider.address.coordinates && 
          provider.address.coordinates.lat && provider.address.coordinates.lng) {
        console.log(`Provider ${provider.name} already has coordinates`);
        continue;
      }
      
      // Try to get coordinates from provider's address city
      if (provider.address && provider.address.city) {
        const cityLower = provider.address.city.toLowerCase();
        coordinates = DEFAULT_COORDINATES[cityLower];
        
        if (coordinates) {
          console.log(`Using default coordinates for ${provider.city}: ${coordinates.lat}, ${coordinates.lng}`);
          needsUpdate = true;
        }
      }
      
      // If no city-specific coordinates, use Delhi as default
      if (!coordinates) {
        coordinates = DEFAULT_COORDINATES.delhi;
        console.log(`Using Delhi as default coordinates for ${provider.name}: ${coordinates.lat}, ${coordinates.lng}`);
        needsUpdate = true;
      }
      
      // Update provider coordinates
      if (needsUpdate && coordinates) {
        await User.updateOne(
          { _id: provider._id },
          { 
            $set: { 
              'address.coordinates': coordinates 
            }
          }
        );
        console.log(`Updated coordinates for provider: ${provider.name}`);
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated coordinates for ${updatedCount} providers`);
    
  } catch (error) {
    console.error('Error updating provider coordinates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the script
updateProviderCoordinates();

const mongoose = require('mongoose');
const User = require('./models/User');

async function setupProviderLocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/insta_serve');
    console.log('Connected to MongoDB');
    
    // Update all active providers to be available and enable location sharing
    const result = await User.updateMany(
      { role: 'provider', isActive: true },
      { 
        isAvailable: true,
        locationSharingEnabled: true
      }
    );
    
    console.log('Updated ' + result.modifiedCount + ' providers to be available and enable location sharing');
    
    // Now set currentLocation from address coordinates for providers who have address data
    const providers = await User.find({ 
      role: 'provider', 
      isActive: true,
      'address.coordinates.lat': { $exists: true },
      'address.coordinates.lng': { $exists: true }
    });
    
    console.log('\nSetting up currentLocation from address coordinates...');
    
    for (const provider of providers) {
      const addressCoords = provider.address.coordinates;
      
      // Update currentLocation with address coordinates
      await User.findByIdAndUpdate(provider._id, {
        currentLocation: {
          lat: addressCoords.lat,
          lng: addressCoords.lng,
          lastUpdated: new Date().toISOString(),
          source: 'address_coordinates'
        }
      });
      
      console.log('Updated ' + provider.name + ' currentLocation: ' + JSON.stringify({
        lat: addressCoords.lat,
        lng: addressCoords.lng
      }));
    }
    
    // Show final provider status
    const finalProviders = await User.find({ role: 'provider' }).select('name email isActive isAvailable locationSharingEnabled currentLocation');
    
    console.log('\n=== FINAL PROVIDERS STATUS ===');
    finalProviders.forEach(provider => {
      console.log('Provider: ' + provider.name + ' - Active: ' + provider.isActive + ', Available: ' + provider.isAvailable + ', Location Sharing: ' + provider.locationSharingEnabled);
      if (provider.currentLocation && provider.currentLocation.lat && provider.currentLocation.lng) {
        console.log('  Location: ' + provider.currentLocation.lat + ', ' + provider.currentLocation.lng);
      }
    });
    
    console.log('\nProvider location setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up provider locations:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the setup
setupProviderLocations();

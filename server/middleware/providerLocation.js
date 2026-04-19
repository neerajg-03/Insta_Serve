const User = require('../models/User');

// Middleware to ensure providers have location data
const ensureProviderLocation = async (req, res, next) => {
  try {
    // Only apply to provider-related operations
    if (req.user && req.user.role === 'provider') {
      const provider = await User.findById(req.user._id);
      
      if (provider && provider.isActive) {
        let needsUpdate = false;
        const updates = {};
        
        // Ensure provider is available
        if (!provider.isAvailable) {
          updates.isAvailable = true;
          needsUpdate = true;
        }
        
        // Ensure location sharing is enabled
        if (!provider.locationSharingEnabled) {
          updates.locationSharingEnabled = true;
          needsUpdate = true;
        }
        
        // Set currentLocation from address coordinates if not present
        if (!provider.currentLocation || 
            !provider.currentLocation.lat || 
            !provider.currentLocation.lng) {
          
          if (provider.address && 
              provider.address.coordinates && 
              provider.address.coordinates.lat && 
              provider.address.coordinates.lng) {
            
            updates.currentLocation = {
              lat: provider.address.coordinates.lat,
              lng: provider.address.coordinates.lng,
              lastUpdated: new Date().toISOString(),
              source: 'address_coordinates'
            };
            needsUpdate = true;
          }
        }
        
        // Apply updates if needed
        if (needsUpdate) {
          await User.findByIdAndUpdate(provider._id, updates);
          console.log('Auto-updated provider location settings for:', provider.name);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in ensureProviderLocation middleware:', error);
    next(); // Continue even if middleware fails
  }
};

module.exports = ensureProviderLocation;

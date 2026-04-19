const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkProviderLocationStatus() {
  try {
    console.log('Checking provider location status...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    // Find all providers
    const providers = await User.find({ role: 'provider' })
      .select('name email isActive isAvailable locationSharingEnabled currentLocation address')
      .lean();
    
    console.log(`Found ${providers.length} providers\n`);
    
    let activeProviders = 0;
    let availableProviders = 0;
    let locationSharingEnabled = 0;
    let withCurrentLocation = 0;
    
    console.log('=== PROVIDER LOCATION STATUS ===\n');
    
    for (const provider of providers) {
      if (provider.isActive) activeProviders++;
      if (provider.isAvailable) availableProviders++;
      if (provider.locationSharingEnabled) locationSharingEnabled++;
      if (provider.currentLocation) withCurrentLocation++;
      
      console.log(`${provider.name} (${provider.email}):`);
      console.log(`  Active: ${provider.isActive ? 'YES' : 'NO'}`);
      console.log(`  Available: ${provider.isAvailable ? 'YES' : 'NO'}`);
      console.log(`  Location Sharing: ${provider.locationSharingEnabled ? 'YES' : 'NO'}`);
      
      if (provider.currentLocation) {
        const lastUpdated = provider.currentLocation.lastUpdated;
        const timeDiff = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : Infinity;
        const hoursAgo = timeDiff / (1000 * 60 * 60);
        
        console.log(`  Current Location: ${provider.currentLocation.lat.toFixed(6)}, ${provider.currentLocation.lng.toFixed(6)}`);
        console.log(`  Last Updated: ${lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}`);
        console.log(`  Hours Ago: ${hoursAgo.toFixed(1)}`);
        console.log(`  Location Fresh: ${hoursAgo < 1 ? 'FRESH' : hoursAgo < 24 ? 'STALE' : 'VERY OLD'}`);
      } else {
        console.log(`  Current Location: NOT SET`);
      }
      
      console.log(`  Address: ${provider.address?.street || 'N/A'}, ${provider.address?.city || 'N/A'}`);
      console.log('');
    }
    
    console.log('=== SUMMARY ===');
    console.log(`Total Providers: ${providers.length}`);
    console.log(`Active Providers: ${activeProviders} (${((activeProviders/providers.length)*100).toFixed(1)}%)`);
    console.log(`Available Providers: ${availableProviders} (${((availableProviders/providers.length)*100).toFixed(1)}%)`);
    console.log(`Location Sharing Enabled: ${locationSharingEnabled} (${((locationSharingEnabled/providers.length)*100).toFixed(1)}%)`);
    console.log(`With Current Location: ${withCurrentLocation} (${((withCurrentLocation/providers.length)*100).toFixed(1)}%)`);
    
    console.log('\n=== RECOMMENDATIONS ===');
    
    if (activeProviders < providers.length) {
      console.log('Some providers are not active. Consider activating them.');
    }
    
    if (availableProviders < activeProviders) {
      console.log('Some active providers are not available for bookings.');
    }
    
    if (locationSharingEnabled < availableProviders) {
      console.log('Some available providers have location sharing disabled.');
      console.log('Providers should enable location sharing to receive nearby bookings.');
    }
    
    if (withCurrentLocation < locationSharingEnabled) {
      console.log('Some providers with location sharing enabled have no current location.');
      console.log('These providers need to grant location permissions in their browser.');
    }
    
    // Check for providers with stale locations
    const staleProviders = providers.filter(p => 
      p.currentLocation && 
      p.currentLocation.lastUpdated && 
      (Date.now() - new Date(p.currentLocation.lastUpdated).getTime()) > 24 * 60 * 60 * 1000
    );
    
    if (staleProviders.length > 0) {
      console.log(`\n${staleProviders.length} providers have stale location data (older than 24 hours):`);
      staleProviders.forEach(p => {
        console.log(`  - ${p.name}: Last updated ${new Date(p.currentLocation.lastUpdated).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking provider location status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the check
checkProviderLocationStatus();

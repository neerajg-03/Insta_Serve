const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

async function fixServiceCategories() {
  try {
    console.log('Fixing service categories...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');
    console.log('Connected to database');
    
    // Find all services with category 'other' that should have different categories
    const services = await Service.find({ category: 'other' });
    console.log(`Found ${services.length} services with category 'other'\n`);
    
    // Map service titles to correct categories
    const serviceCategoryMap = {
      'Painting': 'painting',
      'Tap Repairing': 'plumbing',
      'Home Cleaning': 'home_cleaning',
      'Electrical Repair': 'electrical',
      'Carpentry': 'carpentry',
      'Appliance Repair': 'appliance_repair',
      'Pest Control': 'pest_control',
      'Beauty & Wellness': 'beauty_wellness',
      'Packers & Movers': 'packers_movers',
      'Home Tutoring': 'home_tutoring',
      'Fitness Training': 'fitness_training',
      'Event Management': 'event_management',
      'Photography': 'photography',
      'Web Development': 'web_development',
      'Digital Marketing': 'digital_marketing'
    };
    
    let updatedCount = 0;
    
    for (const service of services) {
      let correctCategory = null;
      
      // Check if title matches any of our mappings
      for (const [title, category] of Object.entries(serviceCategoryMap)) {
        if (service.title.toLowerCase().includes(title.toLowerCase()) || 
            title.toLowerCase().includes(service.title.toLowerCase())) {
          correctCategory = category;
          break;
        }
      }
      
      if (correctCategory && correctCategory !== 'other') {
        // Update the service category
        await Service.updateOne(
          { _id: service._id },
          { $set: { category: correctCategory } }
        );
        
        console.log(`Updated: "${service.title}" - Category changed from 'other' to '${correctCategory}'`);
        updatedCount++;
      } else {
        console.log(`Skipped: "${service.title}" - No better category found`);
      }
    }
    
    console.log(`\nSuccessfully updated ${updatedCount} services`);
    
    // Show updated services
    console.log('\n=== UPDATED SERVICES ===');
    const updatedServices = await Service.find({ category: { $ne: 'other' } });
    updatedServices.forEach(service => {
      console.log(`${service.title} - ${service.category}`);
    });
    
  } catch (error) {
    console.error('Error fixing service categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the fix
fixServiceCategories();

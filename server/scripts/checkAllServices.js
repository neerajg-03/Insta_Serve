const mongoose = require('mongoose');
const Service = require('../models/Service');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function checkAllServices() {
  try {
    console.log('\n🔍 ALL SERVICES IN DATABASE\n');
    
    // Get all services
    const allServices = await Service.find({}).populate('provider', 'name');
    console.log(`\n📊 Total Services: ${allServices.length}`);
    
    // Group by category
    const servicesByCategory = {};
    allServices.forEach(service => {
      if (!servicesByCategory[service.category]) {
        servicesByCategory[service.category] = [];
      }
      servicesByCategory[service.category].push({
        title: service.title,
        provider: service.provider?.name || 'No Provider',
        isApproved: service.isApproved,
        isActive: service.isActive,
        createdBy: service.createdBy
      });
    });
    
    console.log('\n📂 Services by Category:');
    Object.entries(servicesByCategory).forEach(([category, services]) => {
      console.log(`\n${category.toUpperCase()} (${services.length} services):`);
      services.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.title}`);
        console.log(`     - Provider: ${service.provider}`);
        console.log(`     - Approved: ${service.isApproved ? '✅' : '❌'}`);
        console.log(`     - Active: ${service.isActive ? '✅' : '❌'}`);
        console.log(`     - Created By: ${service.createdBy}`);
      });
    });
    
    // Check specifically for plumbing
    if (servicesByCategory['plumbing']) {
      console.log('\n🔧 PLUMBING CATEGORY DETAILS:');
      servicesByCategory['plumbing'].forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.title}`);
        console.log(`     - ID: ${service._id}`);
        console.log(`     - Provider: ${service.provider?.name} (${service.provider?._id})`);
        console.log(`     - Approved: ${service.isApproved}`);
        console.log(`     - Active: ${service.isActive}`);
      });
    } else {
      console.log('\n❌ NO PLUMBING SERVICES FOUND!');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAllServices();

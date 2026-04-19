const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function testServiceCreation() {
  try {
    console.log('\n🧪 TESTING SERVICE CREATION\n');
    
    // Find a provider
    const provider = await User.findOne({ role: 'provider', kycStatus: 'approved' });
    
    if (!provider) {
      console.log('❌ No KYC approved provider found');
      return;
    }
    
    console.log(`✅ Found provider: ${provider.name} (${provider._id})`);
    
    // Create a test service
    const testService = new Service({
      title: 'Test Plumbing Service',
      description: 'Test plumbing service for debugging',
      category: 'plumbing',
      subcategory: 'pipe_repair',
      provider: provider._id,
      price: 500,
      priceType: 'fixed',
      duration: { value: 1, unit: 'hour' },
      serviceArea: 'Delhi',
      skills: ['plumbing', 'pipe_repair'],
      experience: 5,
      certifications: ['Test Certification'],
      isActive: true,
      isApproved: true,
      ratings: { average: 4.5, count: 10 },
      reviews: [],
      bookingCount: 0,
      createdBy: 'provider',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('📝 Creating test service...');
    const savedService = await testService.save();
    console.log(`✅ Service saved with ID: ${savedService._id}`);
    
    // Update provider's services array
    await User.findByIdAndUpdate(provider._id, {
      $push: { services: savedService._id }
    });
    console.log('✅ Updated provider services array');
    
    // Verify the service was saved
    const allServices = await Service.find({});
    console.log(`\n📊 Total services in database: ${allServices.length}`);
    
    const plumbingServices = await Service.find({ category: 'plumbing' });
    console.log(`🔧 Plumbing services: ${plumbingServices.length}`);
    
    // Check provider's services array
    const updatedProvider = await User.findById(provider._id);
    console.log(`👤 Provider services array: ${updatedProvider.services?.length || 0}`);
    
    if (updatedProvider.services && updatedProvider.services.length > 0) {
      console.log('✅ Service creation working correctly!');
    } else {
      console.log('❌ Issue with services array update');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testServiceCreation();

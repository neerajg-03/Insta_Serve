const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function populateTestData() {
  try {
    console.log('\n🌱 POPULATING TEST DATA\n');
    
    // Create test providers
    const providers = [
      {
        name: 'Rohit Sharma',
        email: 'rohit@test.com',
        phone: '+919876543210',
        password: 'password123',
        role: 'provider',
        kycStatus: 'approved',
        isActive: true,
        isVerified: true
      },
      {
        name: 'Sahil Kumar',
        email: 'sahil@test.com', 
        phone: '+919876543211',
        password: 'password123',
        role: 'provider',
        kycStatus: 'approved',
        isActive: true,
        isVerified: true
      },
      {
        name: 'Rajeev Singh',
        email: 'rajeev@test.com',
        phone: '+919876543212',
        password: 'password123',
        role: 'provider',
        kycStatus: 'approved',
        isActive: true,
        isVerified: true
      }
    ];
    
    console.log('👤 Creating test providers...');
    const createdProviders = [];
    
    for (const providerData of providers) {
      const existingProvider = await User.findOne({ email: providerData.email });
      if (!existingProvider) {
        const provider = new User(providerData);
        await provider.save();
        createdProviders.push(provider);
        console.log(`  ✅ Created: ${provider.name}`);
      } else {
        createdProviders.push(existingProvider);
        console.log(`  ⚠️ Already exists: ${existingProvider.name}`);
      }
    }
    
    // Create test services
    const services = [
      {
        title: 'Professional Plumbing Service',
        description: 'Expert plumbing repairs and installations',
        category: 'plumbing',
        subcategory: 'pipe_repair',
        price: 500,
        priceType: 'fixed',
        duration: { value: 2, unit: 'hour' },
        serviceArea: 'Delhi NCR',
        skills: ['plumbing', 'pipe_repair', 'installation'],
        experience: 5,
        certifications: ['Plumbing License'],
        isActive: true,
        isApproved: true,
        createdBy: 'provider'
      },
      {
        title: 'Electrical Repair Services',
        description: 'Complete electrical solutions for home and office',
        category: 'electrical',
        subcategory: 'wiring',
        price: 800,
        priceType: 'fixed',
        duration: { value: 3, unit: 'hour' },
        serviceArea: 'Delhi NCR',
        skills: ['electrical', 'wiring', 'repair'],
        experience: 7,
        certifications: ['Electrician License'],
        isActive: true,
        isApproved: true,
        createdBy: 'provider'
      },
      {
        title: 'Home Cleaning Service',
        description: 'Professional deep cleaning for homes',
        category: 'home_cleaning',
        subcategory: 'deep_cleaning',
        price: 1500,
        priceType: 'fixed',
        duration: { value: 4, unit: 'hour' },
        serviceArea: 'Delhi NCR',
        skills: ['cleaning', 'sanitization'],
        experience: 3,
        certifications: ['Cleaning Certificate'],
        isActive: true,
        isApproved: true,
        createdBy: 'provider'
      }
    ];
    
    console.log('\n🛠️ Creating test services...');
    const createdServices = [];
    
    for (let i = 0; i < services.length; i++) {
      const serviceData = services[i];
      const provider = createdProviders[i % createdProviders.length];
      
      const existingService = await Service.findOne({ title: serviceData.title });
      if (!existingService) {
        const service = new Service({
          ...serviceData,
          provider: provider._id,
          ratings: { average: 4.5, count: 10 },
          reviews: [],
          bookingCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await service.save();
        createdServices.push(service);
        
        // Update provider's services array
        await User.findByIdAndUpdate(provider._id, {
          $push: { services: service._id }
        });
        
        console.log(`  ✅ Created: ${service.title} (Provider: ${provider.name})`);
      } else {
        createdServices.push(existingService);
        console.log(`  ⚠️ Already exists: ${existingService.title}`);
      }
    }
    
    // Create a test customer
    console.log('\n👥 Creating test customer...');
    const customerData = {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+919876543213',
      password: 'password123',
      role: 'customer',
      isActive: true,
      isVerified: true
    };
    
    const existingCustomer = await User.findOne({ email: customerData.email });
    let customer;
    if (!existingCustomer) {
      customer = new User(customerData);
      await customer.save();
      console.log(`  ✅ Created: ${customer.name}`);
    } else {
      customer = existingCustomer;
      console.log(`  ⚠️ Already exists: ${customer.name}`);
    }
    
    // Verify the data
    console.log('\n📊 VERIFICATION:');
    const totalUsers = await User.countDocuments({});
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const totalServices = await Service.countDocuments({});
    const plumbingServices = await Service.countDocuments({ category: 'plumbing' });
    
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Total Providers: ${totalProviders}`);
    console.log(`  Total Services: ${totalServices}`);
    console.log(`  Plumbing Services: ${plumbingServices}`);
    
    // Test the broadcast filtering logic
    console.log('\n🧪 TESTING BROADCAST FILTERING:');
    const allProviders = await User.find({
      role: 'provider',
      isActive: true,
      kycStatus: 'approved'
    }).populate({
      path: 'services',
      match: { 
        category: 'plumbing',
        isApproved: true,
        isActive: true
      }
    }).lean();
    
    const approvedProviders = allProviders.filter(provider => 
      provider.services && provider.services.length > 0
    );
    
    console.log(`  KYC Approved Providers: ${allProviders.length}`);
    console.log(`  Providers with Plumbing Services: ${approvedProviders.length}`);
    
    if (approvedProviders.length > 0) {
      console.log('  ✅ Broadcast filtering working correctly!');
      approvedProviders.forEach(provider => {
        console.log(`    - ${provider.name} (${provider.services?.length || 0} services)`);
      });
    } else {
      console.log('  ❌ No providers with plumbing services found');
    }
    
    console.log('\n🎉 Test data populated successfully!');
    
  } catch (error) {
    console.error('❌ Population error:', error);
  } finally {
    mongoose.connection.close();
  }
}

populateTestData();

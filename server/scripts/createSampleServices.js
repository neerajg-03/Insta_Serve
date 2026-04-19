const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

async function createSampleServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Sample services data
    const sampleServices = [
      {
        title: 'Home Cleaning Service',
        description: 'Professional home cleaning service including dusting, mopping, and bathroom cleaning',
        category: 'home_cleaning',
        subcategory: 'general',
        provider: null,
        price: 1500,
        priceType: 'fixed',
        duration: { value: 3, unit: 'hours' },
        serviceArea: 'Delhi, Mumbai, Bangalore',
        skills: ['mopping', 'dusting', 'bathroom cleaning'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['cleaning', 'home', 'professional']
      },
      {
        title: 'Plumbing Repair',
        description: 'Expert plumbing services for leak repairs, pipe installations, and drainage issues',
        category: 'plumbing',
        subcategory: 'repair',
        provider: null,
        price: 800,
        priceType: 'fixed',
        duration: { value: 2, unit: 'hours' },
        serviceArea: 'Delhi, Gurgaon, Noida',
        skills: ['pipe repair', 'leak fixing', 'installation'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['plumbing', 'repair', 'emergency']
      },
      {
        title: 'Electrical Installation',
        description: 'Professional electrical services including wiring, installation, and repair work',
        category: 'electrical',
        subcategory: 'installation',
        provider: null,
        price: 1200,
        priceType: 'fixed',
        duration: { value: 4, unit: 'hours' },
        serviceArea: 'Mumbai, Pune, Nashik',
        skills: ['wiring', 'installation', 'circuit repair'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['electrical', 'installation', 'wiring']
      },
      {
        title: 'House Painting',
        description: 'Complete house painting services including interior and exterior painting',
        category: 'painting',
        subcategory: 'residential',
        provider: null,
        price: 2500,
        priceType: 'fixed',
        duration: { value: 8, unit: 'hours' },
        serviceArea: 'Bangalore, Chennai, Hyderabad',
        skills: ['painting', 'surface preparation', 'color consultation'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['painting', 'home', 'renovation']
      },
      {
        title: 'Pest Control Service',
        description: 'Comprehensive pest control for homes and offices including termites, cockroaches, and rodents',
        category: 'pest_control',
        subcategory: 'residential',
        provider: null,
        price: 1000,
        priceType: 'fixed',
        duration: { value: 2, unit: 'hours' },
        serviceArea: 'Delhi NCR, Mumbai, Pune',
        skills: ['pest identification', 'chemical treatment', 'prevention'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['pest control', 'sanitation', 'health']
      },
      {
        title: 'AC Repair Service',
        description: 'Professional air conditioner repair and maintenance services',
        category: 'appliance_repair',
        subcategory: 'ac_repair',
        provider: null,
        price: 600,
        priceType: 'fixed',
        duration: { value: 1.5, unit: 'hours' },
        serviceArea: 'Delhi, Mumbai, Bangalore, Chennai',
        skills: ['ac repair', 'maintenance', 'gas refilling'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['ac', 'repair', 'appliance']
      },
      {
        title: 'Packers and Movers',
        description: 'Professional packing and moving services for residential and commercial relocation',
        category: 'packers_movers',
        subcategory: 'local',
        provider: null,
        price: 3000,
        priceType: 'fixed',
        duration: { value: 6, unit: 'hours' },
        serviceArea: 'Delhi, Mumbai, Bangalore, Hyderabad',
        skills: ['packing', 'loading', 'transportation', 'unpacking'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['moving', 'packing', 'relocation']
      },
      {
        title: 'Home Tutoring',
        description: 'Professional tutoring services for students from class 1 to 12',
        category: 'home_tutoring',
        subcategory: 'academic',
        provider: null,
        price: 500,
        priceType: 'per_session',
        duration: { value: 1, unit: 'hours' },
        serviceArea: 'Delhi, Mumbai, Bangalore, Pune',
        skills: ['mathematics', 'science', 'english', 'social studies'],
        experience: 0,
        certifications: [],
        isActive: true,
        isApproved: true,
        ratings: { average: 0, count: 0 },
        reviews: [],
        bookingCount: 0,
        createdBy: 'admin',
        tags: ['tutoring', 'education', 'home']
      }
    ];

    // Check if services already exist
    const existingServices = await Service.find({ createdBy: 'admin' });
    if (existingServices.length > 0) {
      console.log(`❌ Found ${existingServices.length} admin services already created`);
      console.log('💡 If you want to recreate them, delete the existing services first');
      process.exit(0);
    }

    // Create services
    const createdServices = await Service.insertMany(sampleServices);
    console.log(`✅ Successfully created ${createdServices.length} sample services`);
    
    createdServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.title} - ₹${service.price}`);
    });

  } catch (error) {
    console.error('❌ Error creating sample services:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createSampleServices();

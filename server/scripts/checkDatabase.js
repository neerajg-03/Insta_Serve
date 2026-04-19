const mongoose = require('mongoose');
const User = require('../models/User');

require('dotenv').config();

// Connect to MongoDB
console.log('🔗 Connecting to:', process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  
  try {
    // Check database name
    const db = mongoose.connection.db;
    console.log(`📂 Database Name: ${db.databaseName}`);
    
    // Check all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections in database: ${collections.length}`);
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });
    
    // Check users collection specifically
    const userCount = await User.countDocuments({});
    console.log(`\n👥 Total Users: ${userCount}`);
    
    if (userCount > 0) {
      // Get some sample users
      const sampleUsers = await User.find({}).limit(5);
      console.log('\n📋 Sample Users:');
      sampleUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.role}) - ${user.kycStatus || 'no KYC'}`);
      });
      
      // Count by role
      const roleCounts = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      console.log('\n📊 Users by Role:');
      roleCounts.forEach(item => {
        console.log(`  ${item._id}: ${item.count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database check error:', error);
  }
  
  mongoose.connection.close();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Connection string:', process.env.MONGODB_URI || 'mongodb://localhost:27017/instaserve');
});

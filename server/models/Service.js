const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'home_cleaning',
      'beauty_wellness',
      'appliance_repair',
      'plumbing',
      'electrical',
      'carpentry',
      'painting',
      'pest_control',
      'packers_movers',
      'home_tutoring',
      'fitness_training',
      'event_management',
      'photography',
      'web_development',
      'digital_marketing',
      'other'
    ]
  },
  subcategory: {
    type: String,
    required: [true, 'Subcategory is required']
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional for admin-created services
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  priceType: {
    type: String,
    enum: ['fixed', 'hourly', 'per_session', 'per_sqft'],
    default: 'fixed'
  },
  duration: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'hours'
    }
  },
  images: [{
    type: String,
    default: []
  }],
  availability: {
    weekdays: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }],
    bufferTime: {
      type: Number,
      default: 30 // minutes between bookings
    }
  },
  serviceArea: {
    type: String,
    required: [true, 'Service area is required']
  },
  maxDistance: {
    type: Number,
    default: 10 // kilometers
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    default: 0 // years
  },
  certifications: [{
    name: String,
    issuer: String,
    year: Number,
    certificateUrl: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  approvedAt: {
    type: Date,
    required: false
  },
  isRejected: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String,
    required: false
  },
  rejectedAt: {
    type: Date,
    required: false
  },
  bookingCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Enhanced admin/provider workflow fields
  createdBy: {
    type: String,
    enum: ['admin', 'provider'],
    default: 'provider'
  },
  serviceReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false
  },
  providerRequests: [{
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    isRejected: {
      type: Boolean,
      default: false
    },
    rejectionReason: {
      type: String,
      required: false
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date,
      required: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    }
  }],
  // For admin-created services that are available for providers to apply for
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateServiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false
  }
}, {
  timestamps: true
});

// Index for search functionality
serviceSchema.index({ title: 'text', description: 'text', skills: 'text', tags: 'text' });
serviceSchema.index({ category: 1, subcategory: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ 'serviceArea': 'text' });
serviceSchema.index({ price: 1 });
serviceSchema.index({ 'ratings.average': -1 });

module.exports = mongoose.model('Service', serviceSchema);

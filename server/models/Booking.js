const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional for broadcast bookings
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
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
  address: {
    street: {
      type: String,
      required: function() {
        // Street is optional if coordinates are provided (current location)
        return !this.coordinates || !this.coordinates.lat || !this.coordinates.lng;
      }
    },
    city: {
      type: String,
      required: function() {
        // City is optional if coordinates are provided (current location)
        return !this.coordinates || !this.coordinates.lat || !this.coordinates.lng;
      }
    },
    state: {
      type: String,
      required: function() {
        // State is optional if coordinates are provided (current location)
        return !this.coordinates || !this.coordinates.lat || !this.coordinates.lng;
      }
    },
    pincode: {
      type: String,
      required: function() {
        // Pincode is optional if coordinates are provided (current location)
        return !this.coordinates || !this.coordinates.lat || !this.coordinates.lng;
      }
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  price: {
    basePrice: {
      type: Number,
      required: true
    },
    additionalCharges: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'broadcast', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  customerNotes: {
    type: String,
    maxlength: [500, 'Customer notes cannot exceed 500 characters']
  },
  providerNotes: {
    type: String,
    maxlength: [500, 'Provider notes cannot exceed 500 characters']
  },
  actualStartTime: Date,
  actualEndTime: Date,
  completionPhotos: [{
    type: String
  }],
  // Broadcast booking fields
  broadcastTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  broadcastSentAt: Date,
  broadcastAcceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: Date,
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    reviewedAt: Date
  },
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  refundAmount: {
    type: Number,
    default: 0
  },
  timeline: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded', 'broadcast_rejected']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['booking_created', 'booking_confirmed', 'booking_started', 'booking_completed', 'booking_cancelled', 'payment_received', 'review_received']
    },
    sentTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    message: String
  }]
}, {
  timestamps: true
});

// Index for efficient queries
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ service: 1 });
bookingSchema.index({ 'paymentStatus': 1 });

// Pre-save middleware to update timeline
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.customer // This should be updated based on who made the change
    });
  }
  next();
});

// Method to calculate total price
bookingSchema.methods.calculateTotalPrice = function() {
  this.price.totalPrice = this.price.basePrice + this.price.additionalCharges - this.price.discount;
  return this.price.totalPrice;
};

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const timeDiff = this.scheduledDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Can cancel if more than 2 hours before scheduled time
  return hoursDiff > 2 && ['pending', 'confirmed'].includes(this.status);
};

module.exports = mongoose.model('Booking', bookingSchema);

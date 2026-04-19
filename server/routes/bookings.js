const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/service-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// @route   GET /api/bookings
// @desc    Get user bookings (customer or provider)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      dateFrom, 
      dateTo,
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'provider') {
      // For providers, get both assigned bookings AND broadcast bookings sent to them
      query.$or = [
        { provider: req.user._id }, // Their assigned bookings
        { 
          status: 'broadcast',
          'broadcastTo': req.user._id // Broadcast bookings sent to them
        }
      ];
    }

    // Add filters
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('service', 'title category price images')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/bookings/reviews
// @desc    Get reviews from completed bookings for home page
// @access  Public
router.get('/reviews', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    // Find completed bookings with reviews
    const bookingsWithReviews = await Booking.find({
      status: 'completed',
      'review.rating': { $exists: true, $ne: null }
    })
    .populate('customer', 'name')
    .populate('service', 'title')
    .populate('provider', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    // Transform bookings into testimonial format
    const testimonials = bookingsWithReviews.map(booking => ({
      _id: booking._id,
      name: booking.customer?.name || 'Anonymous Customer',
      service: booking.service?.title || 'Service',
      provider: booking.provider?.name || 'Service Provider',
      rating: booking.review?.rating || 5,
      comment: booking.review?.comment || 'Excellent service!',
      date: booking.createdAt,
      verified: true
    }));

    res.json({
      testimonials,
      count: testimonials.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get single booking by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('provider', 'name email phone address ratings')
      .populate('service', 'title category description price images provider');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is authorized to view this booking
    if (
      booking.customer._id.toString() !== req.user._id.toString() &&
      (!booking.provider || booking.provider._id.toString() !== req.user._id.toString()) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    // Get Socket.IO instance and add user to booking room for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Find all connected sockets for this user and add them to booking room
      const sockets = await io.in(`user_${req.user._id}`).allSockets();
      sockets.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`booking_${req.params.id}`);
          console.log(`📋 User ${req.user.name} (${req.user.role}) auto-joined booking room: ${req.params.id}`);
        }
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings
// @desc    Create a new booking (customer only)
// @access  Private (Customer)
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const {
      service, // Changed from serviceId to service
      scheduledDate,
      duration,
      address,
      notes
    } = req.body;

    // Validate service
    const serviceData = await Service.findById(service);
    if (!serviceData) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (!serviceData.isActive || !serviceData.isApproved) {
      return res.status(400).json({ message: 'Service is not available' });
    }

    // For broadcast booking, find AVAILABLE providers within 7km range
    const bookingCoordinates = address.coordinates;
    let nearbyProviders = [];

    if (bookingCoordinates && bookingCoordinates.lat && bookingCoordinates.lng) {
      // Find all AVAILABLE providers with approved services in this category
      // and ensure they have location sharing enabled
      const providersWithServices = await Service.find({
        category: serviceData.category,
        isApproved: true,
        isActive: true,
        provider: { $exists: true, $ne: null }
      }).populate('provider', 'name email isActive kycStatus address isAvailable locationSharingEnabled currentLocation').lean();

      // Group providers by ID and filter for AVAILABLE providers only
      const providerMap = new Map();
      
      providersWithServices.forEach(service => {
        if (!service.provider) {
          return;
        }

        // CRITICAL: Only include providers who are:
        // 1. Active (account is active)
        // 2. Have approved service in this category
        // Note: Providers are automatically considered available when active
        if (!service.provider.isActive) {
          console.log(`Provider ${service.provider.name} excluded: active=${service.provider.isActive}`);
          return;
        }
        
        const providerId = service.provider._id.toString();
        
        // Only add provider if they have an approved and active service in this exact category
        if (service.category === serviceData.category && service.isApproved && service.isActive) {
          if (!providerMap.has(providerId)) {
            providerMap.set(providerId, service.provider);
          }
        }
      });
      
      // Get Socket.IO instance to access live provider locations from booking room
      const io = req.app.get('io');
      const liveProviderLocations = new Map();
      
      // Extract live provider locations from connected users in booking room
      if (io) {
        // Get all connected users and their locations from the server's userLocations map
        const connectedUsers = Array.from(io.sockets.sockets.values())
          .map(socket => {
            const userData = socket.handshake.auth || socket.userData;
            return {
              socketId: socket.id,
              userId: userData?.userId,
              name: userData?.name,
              role: userData?.role
            };
          })
          .filter(user => user.role === 'provider' && user.userId);
        
        console.log(`Found ${connectedUsers.length} connected providers`);
        
        // Get live locations from the server's userLocations map
        const serverUserLocations = req.app.get('userLocations') || new Map();
        serverUserLocations.forEach((locationData, userId) => {
          if (locationData.userRole === 'provider' && locationData.location) {
            liveProviderLocations.set(userId.toString(), {
              lat: locationData.location.lat,
              lng: locationData.location.lng,
              timestamp: locationData.timestamp,
              source: 'LIVE (booking room)',
              isRealTime: true
            });
          }
        });
        
        console.log(`Found ${liveProviderLocations.size} providers with live locations`);
      }
      
      // Filter providers by distance (within 7km) using LIVE locations first, then database locations
      const EARTH_RADIUS = 6371; // Earth's radius in kilometers
      
      nearbyProviders = Array.from(providerMap.values())
        .filter(provider => {
          let providerLocation = null;
          let locationType = '';
          let isRealTimeLocation = false;
          
          console.log(`\n=== DEBUGGING DISTANCE CALCULATION FOR ${provider.name} ===`);
          console.log('Provider full object:', JSON.stringify(provider, null, 2));
          
          // PRIORITY 1: Use LIVE location from booking room if available
          const liveLocation = liveProviderLocations.get(provider._id.toString());
          if (liveLocation) {
            providerLocation = {
              lat: liveLocation.lat,
              lng: liveLocation.lng
            };
            locationType = 'LIVE LOCATION (booking room)';
            isRealTimeLocation = true;
            
            console.log(`✅ Using LIVE location from booking room: ${providerLocation.lat}, ${providerLocation.lng}`);
            console.log(`Location timestamp: ${liveLocation.timestamp}`);
            console.log(`Location source: ${liveLocation.source}`);
            console.log(`Provider availability: ${provider.isAvailable ? 'ONLINE' : 'OFFLINE'}`);
          }
          // PRIORITY 2: Use database currentLocation if live location not available
          else if (provider.currentLocation && 
                   provider.currentLocation.lat && 
                   provider.currentLocation.lng) {
            // Check if location data is fresh enough for 7km filter
            const locationAge = Date.now() - new Date(provider.currentLocation.lastUpdated).getTime();
            const ageInMinutes = Math.floor(locationAge / (1000 * 60));
            
            // Skip stale locations for 7km filter (older than 30 minutes)
            if (ageInMinutes > 30) {
              console.log(`Provider ${provider.name} has stale location (${ageInMinutes} minutes old), excluding from 7km filter`);
              return false; // Exclude from 7km filter, but will be included in fallback
            }
            
            providerLocation = provider.currentLocation;
            locationType = 'database current location';
            
            console.log(`Using database current location: ${providerLocation.lat}, ${providerLocation.lng}`);
            console.log(`Location last updated: ${provider.currentLocation.lastUpdated}`);
            console.log(`Location age: ${ageInMinutes} minutes ago`);
            console.log(`Provider availability: ${provider.isAvailable ? 'ONLINE' : 'OFFLINE'}`);
            console.log(`Location sharing enabled: ${provider.locationSharingEnabled ? 'YES' : 'NO'}`);
          }
          // PRIORITY 3: Use address coordinates as final fallback
          else if (provider.address && 
                     provider.address.coordinates && 
                     provider.address.coordinates.lat && 
                     provider.address.coordinates.lng) {
            providerLocation = provider.address.coordinates;
            locationType = 'address coordinates (fallback)';
            console.log(`Using address coordinates as fallback: ${providerLocation.lat}, ${providerLocation.lng}`);
          }
          
          if (!providerLocation) {
            console.log(`❌ Provider ${provider.name} has no valid location data, excluding from 7km filter (will be included in fallback)`);
            return false;
          }
          
          console.log(`Booking coordinates: ${bookingCoordinates.lat}, ${bookingCoordinates.lng}`);
          console.log(`Provider coordinates: ${providerLocation.lat}, ${providerLocation.lng}`);
          
          // Calculate distance using Haversine formula
          const lat1 = bookingCoordinates.lat * Math.PI / 180;
          const lon1 = bookingCoordinates.lng * Math.PI / 180;
          const lat2 = providerLocation.lat * Math.PI / 180;
          const lon2 = providerLocation.lng * Math.PI / 180;
          
          console.log(`Converted to radians - lat1: ${lat1}, lon1: ${lon1}, lat2: ${lat2}, lon2: ${lon2}`);
          
          const dLat = lat2 - lat1;
          const dLon = lon2 - lon1;
          
          console.log(`Delta lat: ${dLat}, delta lon: ${dLon}`);
          
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = EARTH_RADIUS * c;
          
          console.log(`Haversine calculation - a: ${a}, c: ${c}, distance: ${distance.toFixed(2)}km`);
          console.log(`✅ Distance to ${provider.name}: ${distance.toFixed(2)}km (${isRealTimeLocation ? 'LIVE' : 'STATIC'}, approved ${serviceData.category} service, using ${locationType})`);
          console.log(`=== END DEBUGGING FOR ${provider.name} ===\n`);
          
          return distance <= 7; // Within 7km range
        })
        .map(provider => provider._id);

      console.log('7km Range Filter Results (AVAILABLE PROVIDERS ONLY):');
      console.log('  - Booking Coordinates:', bookingCoordinates);
      console.log('  - Total Providers in Category:', providersWithServices.length);
      console.log('  - Available Providers with Location Sharing:', Array.from(providerMap.keys()).length);
      console.log('  - Available Providers within 7km:', nearbyProviders.length);
      console.log('  - Nearby Provider IDs:', nearbyProviders);
      
    } else {
      // Fallback: If no coordinates provided, use available providers in category
      console.log('No booking coordinates provided, using fallback method...');
      
      const providersWithServices = await Service.find({
        category: serviceData.category,
        isApproved: true,
        isActive: true,
        provider: { $exists: true, $ne: null }
      }).populate('provider', 'name email isActive kycStatus isAvailable locationSharingEnabled').lean();

      // Group providers by ID and filter for AVAILABLE providers only
      const providerMap = new Map();
      
      providersWithServices.forEach(service => {
        if (!service.provider) {
          return;
        }

        // Only include active providers (location sharing not required for fallback)
        if (!service.provider.isActive) {
          return;
        }
        
        const providerId = service.provider._id.toString();
        
        // Only add provider if they have an approved and active service in this exact category
        if (service.category === serviceData.category && service.isApproved && service.isActive) {
          if (!providerMap.has(providerId)) {
            providerMap.set(providerId, service.provider);
          }
        }
      });

      nearbyProviders = Array.from(providerMap.values())
        .map(provider => provider._id);
      
      console.log('Fallback - Available providers found:', nearbyProviders.length);
    }

    // If no nearby providers found, try broader search but still filter for available providers
    if (nearbyProviders.length === 0) {
      console.log('No available providers within 7km, expanding search to all available providers in category...');
      
      const allCategoryProviders = await Service.find({
        category: serviceData.category,
        isApproved: true,
        isActive: true,
        provider: { $exists: true, $ne: null }
      }).populate('provider', 'name email isActive kycStatus address isAvailable locationSharingEnabled currentLocation').lean();
      
      // Group providers by ID and filter for AVAILABLE providers only
      const providerMap = new Map();
      
      allCategoryProviders.forEach(service => {
        if (!service.provider) {
          return;
        }

        // CRITICAL: Only include providers who are:
        // 1. Active (account is active)
        // 2. Have approved service in this category
        // Note: Providers are automatically considered available when active
        if (!service.provider.isActive) {
          return;
        }
        
        const providerId = service.provider._id.toString();
        
        // Only add provider if they have an approved and active service in this exact category
        if (service.category === serviceData.category && service.isApproved && service.isActive) {
          if (!providerMap.has(providerId)) {
            providerMap.set(providerId, service.provider);
          }
        }
      });
      
      const allAvailableProviders = Array.from(providerMap.values());
      
      const providersWithCoordinates = allAvailableProviders
        .filter(provider => 
          provider.currentLocation &&
          provider.currentLocation.lat &&
          provider.currentLocation.lng
        )
        .map(provider => provider._id);
      
      const providersWithoutCoordinates = allAvailableProviders
        .filter(provider => 
          !provider.currentLocation || 
          !provider.currentLocation.lat || 
          !provider.currentLocation.lng
        )
        .map(provider => provider._id);
      
      console.log('Available providers with coordinates:', providersWithCoordinates.length);
      console.log('Available providers without coordinates:', providersWithoutCoordinates.length);
      
      // Include providers with coordinates first, then providers without coordinates
      nearbyProviders = [...providersWithCoordinates, ...providersWithoutCoordinates];
      
      console.log('Expanded search - Available providers found:', nearbyProviders.length);
      
      if (nearbyProviders.length === 0) {
        return res.status(404).json({ 
          message: 'No available providers found for this service. Please try again later or check if providers are online.' 
        });
      }
    }

    // Calculate price
    let totalPrice = serviceData.price;
    if (serviceData.priceType === 'hourly') {
      totalPrice = serviceData.price * duration.value;
    }

    // Create broadcast booking (no provider assigned initially)
    const booking = new Booking({
      customer: req.user._id,
      provider: null, // No provider assigned for broadcast
      service: service,
      scheduledDate: new Date(scheduledDate),
      duration,
      address,
      notes,
      status: 'broadcast', // Broadcast status
      price: {
        basePrice: totalPrice,
        additionalCharges: 0,
        totalPrice: totalPrice,
        currency: 'INR'
      },
      serviceArea: serviceData.serviceArea,
      broadcastTo: nearbyProviders, // Only providers within 7km range
      broadcastSentAt: new Date()
    });

    await booking.save();

    // Populate and return
    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('service', 'title category price images');

    // Emit Socket.IO broadcast to approved providers only
    const io = req.app.get('io');
    if (io) {
      const broadcastData = {
        bookingId: booking._id,
        customerId: req.user._id,
        customerName: req.user.name,
        serviceTitle: serviceData.title,
        serviceCategory: serviceData.category,
        scheduledDate: booking.scheduledDate,
        address: booking.address,
        price: totalPrice,
        broadcastTo: nearbyProviders,
        timestamp: new Date()
      };
      
      // Send only to specific providers in broadcastTo array
      nearbyProviders.forEach(providerId => {
        io.to(`user_${providerId}`).emit('new_service_request', broadcastData);
      });
      
      console.log(`Broadcast sent to ${nearbyProviders.length} providers:`, nearbyProviders);
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking status (provider/customer)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const isProvider = booking.provider && booking.provider.toString() === req.user._id.toString();
    const isBroadcastProvider = booking.status === 'broadcast' && booking.broadcastTo && booking.broadcastTo.includes(req.user._id.toString());

    if (!isCustomer && !isProvider && !isBroadcastProvider && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    // Validate status transitions
    const validTransitions = {
      broadcast: ['confirmed', 'cancelled'],  // Broadcast can be confirmed or cancelled
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${booking.status} to ${status}` 
      });
    }

    // Update booking
    booking.status = status;
    
    // If provider is accepting a broadcast booking, assign them and notify others
    if (isBroadcastProvider && status === 'confirmed') {
      // Store original broadcastTo before clearing it
      const originalBroadcastTo = booking.broadcastTo || [];
      
      booking.provider = req.user._id;
      booking.broadcastAcceptedAt = new Date();
      booking.broadcastAcceptedBy = req.user._id;
      
      // Remove from broadcastTo array so other providers can't see it
      booking.broadcastTo = [];
      
      // Emit Socket.IO notification to all providers that this booking is no longer available
      const io = req.app.get('io');
      if (io) {
        const bookingClosedData = {
          bookingId: booking._id,
          message: 'This booking has been accepted by another provider',
          status: 'accepted_by_other',
          timestamp: new Date()
        };
        
        // Send to all providers who were originally broadcasted to
        // except the one who accepted it
        originalBroadcastTo.forEach(providerId => {
          if (providerId.toString() !== req.user._id.toString()) {
            io.to(`user_${providerId}`).emit('booking_no_longer_available', bookingClosedData);
          }
        });
        
        console.log(`Notified ${originalBroadcastTo.length - 1} other providers that booking ${booking._id} is no longer available`);
      }
    }
    
    if (notes) {
      if (isCustomer) {
        booking.customerNotes = notes;
      } else if (isProvider || isBroadcastProvider) {
        booking.providerNotes = notes;
      }
    }

    // Add timeline entry
    booking.timeline.push({
      status,
      timestamp: new Date(),
      note: notes,
      updatedBy: req.user._id
    });

    // Handle specific status changes
    if (status === 'in_progress') {
      booking.actualStartTime = new Date();
    } else if (status === 'completed') {
      booking.actualEndTime = new Date();
    } else if (status === 'cancelled') {
      booking.cancelledBy = req.user._id;
      booking.cancelledAt = new Date();
      if (notes) {
        booking.cancellationReason = notes;
      }
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('service', 'title category price images');

    res.json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel a booking
// @access  Private
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const isProvider = booking.provider.toString() === req.user._id.toString();

    if (!isCustomer && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    // Check if booking can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking cannot be cancelled' });
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();
    if (reason) {
      booking.cancellationReason = reason;
    }

    // Add timeline entry
    booking.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason || 'Booking cancelled',
      updatedBy: req.user._id
    });

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('service', 'title category price images');

    res.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings/:id/complete-customer
// @desc    Complete a booking and add review (customer only)
// @access  Private (Customer)
router.post('/:id/complete-customer', protect, authorize('customer'), async (req, res) => {
  try {
    const { rating, comment, completionPhotos } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking belongs to customer
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this booking' });
    }

    // Check if booking can be completed (allow both in_progress and completed for reviews)
    if (booking.status !== 'in_progress' && booking.status !== 'completed') {
      return res.status(400).json({ message: 'Booking must be in progress or completed to add a review' });
    }
    
    // If booking is already completed, just add the review
    if (booking.status === 'completed') {
      // Add review if provided
      if (rating) {
        booking.review = {
          rating,
          comment: comment || '',
          reviewedAt: new Date()
        };

        // Update service rating
        const Service = require('../models/Service');
        const service = await Service.findById(booking.service);
        if (service) {
          service.reviews.push({
            customer: req.user._id,
            booking: booking._id,
            rating,
            comment: comment || '',
            createdAt: new Date()
          });

          // Calculate new average rating
          const totalRating = service.reviews.reduce((sum, review) => sum + review.rating, 0);
          service.ratings.average = totalRating / service.reviews.length;
          service.ratings.count = service.reviews.length;
          service.bookingCount += 1;

          await service.save();
        }
      }

      // Add timeline entry for review
      booking.timeline.push({
        status: 'completed',
        timestamp: new Date(),
        note: 'Customer added review',
        updatedBy: req.user._id
      });

      await booking.save();

      const updatedBooking = await Booking.findById(booking._id)
        .populate('customer', 'name email phone')
        .populate('provider', 'name email phone')
        .populate('service', 'title category price images');

      res.json({
        message: 'Review added successfully',
        booking: updatedBooking
      });
      return;
    }

    // Update booking
    booking.status = 'completed';
    booking.actualEndTime = new Date();
    if (completionPhotos && completionPhotos.length > 0) {
      booking.completionPhotos = completionPhotos;
    }

    // Add review if provided
    if (rating) {
      booking.review = {
        rating,
        comment: comment || '',
        reviewedAt: new Date()
      };

      // Update service rating
      const Service = require('../models/Service');
      const service = await Service.findById(booking.service);
      if (service) {
        service.reviews.push({
          customer: req.user._id,
          booking: booking._id,
          rating,
          comment: comment || '',
          createdAt: new Date()
        });

        // Calculate new average rating
        const totalRating = service.reviews.reduce((sum, review) => sum + review.rating, 0);
        service.ratings.average = totalRating / service.reviews.length;
        service.ratings.count = service.reviews.length;
        service.bookingCount += 1;

        await service.save();
      }
    }

    // Add timeline entry
    booking.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      note: 'Booking completed',
      updatedBy: req.user._id
    });

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('service', 'title category price images');

    res.json({
      message: 'Booking completed successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings/upload-service-images
// @desc    Upload service completion images
// @access  Private (Provider)
router.post('/upload-service-images', protect, authorize('provider'), upload.array('images', 5), async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking belongs to provider
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to upload images for this booking' });
    }

    // Process uploaded images
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageUrls.push(`/uploads/service-images/${file.filename}`);
      });
    }

    res.json({
      message: 'Images uploaded successfully',
      imageUrls: imageUrls
    });
  } catch (error) {
    console.error('Upload service images error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings/:id/complete
// @desc    Complete a booking (Provider only)
// @access  Private (Provider)
router.post('/:id/complete', protect, authorize('provider'), async (req, res) => {
  try {
    const { images } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking belongs to provider
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this booking' });
    }

    // Check if booking can be completed
    if (booking.status !== 'in_progress') {
      return res.status(400).json({ message: 'Booking must be in progress to be completed' });
    }

    // Update booking status
    booking.status = 'completed';
    booking.completedAt = new Date();
    
    // Add service completion images if provided
    if (images && images.length > 0) {
      booking.completionPhotos = images;
    }

    // Add timeline entry
    booking.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      note: 'Service completed by provider',
      updatedBy: req.user._id
    });

    await booking.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`booking_${booking._id}`).emit('booking_update', {
        bookingId: booking._id,
        status: 'completed',
        customerId: booking.customer,
        providerId: booking.provider,
        message: 'Service has been completed',
        timestamp: new Date()
      });
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('service', 'title category price images');

    res.json({
      message: 'Service completed successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Provider complete booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings/:id/reject-broadcast
// @desc    Remove provider from broadcast list (provider rejects broadcast request)
// @access  Private (Provider)
router.post('/:id/reject-broadcast', protect, authorize('provider'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking is in broadcast status and provider is in broadcastTo list
    if (booking.status !== 'broadcast') {
      return res.status(400).json({ message: 'Booking is not in broadcast status' });
    }

    if (!booking.broadcastTo || !booking.broadcastTo.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not authorized to reject this broadcast request' });
    }

    // Remove provider from broadcastTo array
    booking.broadcastTo = booking.broadcastTo.filter(providerId => 
      providerId.toString() !== req.user._id.toString()
    );

    // Add timeline entry
    booking.timeline.push({
      status: 'broadcast_rejected',
      timestamp: new Date(),
      note: `Provider ${req.user.name} rejected this broadcast request`,
      updatedBy: req.user._id
    });

    await booking.save();

    res.json({
      message: 'Broadcast request rejected successfully',
      booking
    });
  } catch (error) {
    console.error('Reject broadcast request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;

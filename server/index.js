const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO authentication middleware (simplified for now)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      // Allow connection without token for now, but mark as unauthenticated
      console.log('⚠️ No token provided, allowing unauthenticated connection');
      return next();
    }

    // For now, skip JWT verification to get basic connection working
    // TODO: Add proper JWT verification later
    console.log('✅ Token provided, skipping verification for now');
    next();
  } catch (error) {
    console.error('Socket.IO authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Store connected users and their locations
const connectedUsers = new Map();
const userLocations = new Map();

// Simple CORS configuration - Allow localhost for development
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3000/', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware - Configure helmet to allow CORS
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://checkout.razorpay.com"
        ],
        connectSrc: [
          "'self'",
          "https://insta-serve.onrender.com",
          "https://checkout.razorpay.com"
        ],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limiting
app.set('trust proxy', 1);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Debug CORS requests
app.use((req, res, next) => {
  console.log('🌐 CORS Request:', {
    method: req.method,
    origin: req.headers.origin,
    path: req.path,
    'User-Agent': req.headers['user-agent']
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_serve', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Import provider location middleware
const ensureProviderLocation = require('./middleware/providerLocation');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/provider', ensureProviderLocation, require('./routes/provider'));
app.use('/api', require('./routes/kyc'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('🌐 CORS Test Request:', {
    origin: req.headers.origin,
    method: req.method,
    headers: req.headers
  });
  
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({ 
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// Serve React build
app.use(express.static(path.join(__dirname, "../client/build")));

// Handle React routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});


// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // For now, rely on the authenticate event instead of middleware
  console.log('🔌 Waiting for authentication event...');

  // Handle user authentication and registration
  socket.on('authenticate', (userData) => {
    if (userData && userData.userId) {
      connectedUsers.set(socket.id, userData);
      console.log(`✅ User authenticated: ${userData.name} (${userData.role})`);
      
      // Join user to their personal room for targeted updates
      socket.join(`user_${userData.userId}`);
      
      // Join providers to their role room for broadcast requests
      if (userData.role === 'provider') {
        socket.join('providers');
        // Also join providers to a general location room for live tracking
        socket.join('provider_location_room');
        console.log(`📍 Provider ${userData.name} joined provider location room for live tracking`);
      }
    } else {
      console.log('⚠️ Invalid user data received');
    }
  });

  // Handle joining booking rooms for targeted location sharing
  socket.on('join_booking_room', (bookingId) => {
    const user = connectedUsers.get(socket.id);
    if (user && bookingId) {
      socket.join(`booking_${bookingId}`);
      console.log(`📋 User ${user.name} joined booking room: ${bookingId}`);
    }
  });

  // Handle leaving booking rooms
  socket.on('leave_booking_room', (bookingId) => {
    const user = connectedUsers.get(socket.id);
    if (user && bookingId) {
      socket.leave(`booking_${bookingId}`);
      console.log(`📋 User ${user.name} left booking room: ${bookingId}`);
    }
  });

  // Handle location updates
  socket.on('location_update', (locationData) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Store user's location
      userLocations.set(user.userId, {
        ...locationData,
        timestamp: new Date(),
        userName: user.name,
        userRole: user.role
      });
      
      console.log(`📍 [DEBUG] Location update from ${user.name} (${user.role}):`, locationData);
      
      // Include bookingId if provided in location data for targeted sharing
      const bookingId = locationData.bookingId;
      
      if (bookingId) {
        console.log(`📍 [DEBUG] Processing targeted location update for booking ${bookingId}`);
        // Share location only between provider and customer of the same booking
        if (user.role === 'provider') {
          // Send provider location to customer of this booking (exclude sender)
          const providerLocationData = {
            providerId: user.userId,
            providerName: user.name,
            location: locationData,
            timestamp: new Date(),
            bookingId: bookingId
          };
          
          const room = `booking_${bookingId}`;
          const roomMembers = io.sockets.adapter.rooms.get(room);
          
          if (roomMembers && roomMembers.size > 0) {
            socket.to(room).emit('provider_location_update', providerLocationData);
            console.log(`📍 [DEBUG] Provider location sent to room ${room}:`, providerLocationData);
          } else {
            // Fallback to broadcast if room is empty
            socket.broadcast.emit('provider_location_update', providerLocationData);
            console.log(`📍 [DEBUG] Room ${room} empty, using broadcast fallback:`, providerLocationData);
          }
        } else if (user.role === 'customer') {
          // Send customer location to provider of this booking (exclude sender)
          const customerLocationData = {
            customerId: user.userId,
            customerName: user.name,
            location: locationData,
            timestamp: new Date(),
            bookingId: bookingId
          };
          
          const room = `booking_${bookingId}`;
          const roomMembers = io.sockets.adapter.rooms.get(room);
          
          if (roomMembers && roomMembers.size > 0) {
            socket.to(room).emit('customer_location_update', customerLocationData);
            console.log(`📍 [DEBUG] Customer location sent to room ${room}:`, customerLocationData);
          } else {
            // Fallback to broadcast if room is empty
            socket.broadcast.emit('customer_location_update', customerLocationData);
            console.log(`📍 [DEBUG] Room ${room} empty, using broadcast fallback:`, customerLocationData);
          }
        }
      } else {
        console.log(`📍 [DEBUG] No bookingId provided, using fallback broadcast`);
        // Fallback: broadcast to all (for testing or when bookingId is not available)
        if (user.role === 'provider') {
          const providerData = {
            providerId: user.userId,
            providerName: user.name,
            location: locationData,
            timestamp: new Date()
          };
          socket.broadcast.emit('provider_location_update', providerData);
          console.log(`📍 [DEBUG] Provider location broadcasted:`, providerData);
        } else if (user.role === 'customer') {
          const customerData = {
            customerId: user.userId,
            customerName: user.name,
            location: locationData,
            timestamp: new Date()
          };
          socket.broadcast.emit('customer_location_update', customerData);
          console.log(`📍 [DEBUG] Customer location broadcasted:`, customerData);
        }
      }
    } else {
      console.log(`⚠️ [DEBUG] Location update received from unauthenticated user:`, locationData);
    }
  });

  // Handle booking status updates
  socket.on('booking_status_update', (bookingData) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Broadcast to all relevant parties
      socket.to(`user_${bookingData.customerId}`).emit('booking_update', bookingData);
      socket.to(`user_${bookingData.providerId}`).emit('booking_update', bookingData);
      
      console.log(`📢 Booking update broadcasted: ${bookingData.bookingId} - ${bookingData.status}`);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && data.bookingId) {
      const typingData = {
        ...data,
        userId: user.userId,
        userName: user.name
      };
      
      // Send typing indicator to booking room
      const bookingRoom = `booking_${data.bookingId}`;
      socket.to(bookingRoom).emit('user_typing', typingData);
      
      console.log(`💬 [DEBUG] Typing indicator sent to room ${bookingRoom}:`, typingData);
    }
  });

  // Handle real-time chat
  socket.on('send_message', (messageData) => {
    console.log('💬 [DEBUG] Chat message received:', messageData);
    const user = connectedUsers.get(socket.id);
    if (user) {
      const message = {
        ...messageData,
        senderName: user.name,
        senderRole: user.role,
        timestamp: new Date()
      };
      
      console.log('💬 [DEBUG] Processed message:', message);
      console.log('💬 [DEBUG] Booking ID:', messageData.bookingId);
      
      // Send message to booking room (both user and provider in same room)
      const bookingRoom = `booking_${messageData.bookingId}`;
      const roomMembers = io.sockets.adapter.rooms.get(bookingRoom);
      
      if (roomMembers && roomMembers.size > 0) {
        socket.to(bookingRoom).emit('receive_message', message);
        console.log(`💬 [DEBUG] Message sent to booking room ${bookingRoom}:`, message);
      } else {
        console.log(`💬 [DEBUG] Booking room ${bookingRoom} empty, sending to user rooms as fallback`);
        // Fallback to user rooms
        socket.to(`user_${messageData.recipientId}`).emit('receive_message', message);
        socket.to(`user_${user.userId}`).emit('receive_message', message);
      }
    } else {
      console.log('💬 [ERROR] User not found for chat message');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`🔌 User disconnected: ${user.name} (${user.role})`);
      connectedUsers.delete(socket.id);
      userLocations.delete(user.userId);
    }
  });
});

// Make io and userLocations available to routes
app.set('io', io);
app.set('userLocations', userLocations);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 Socket.IO enabled for real-time features`);
});

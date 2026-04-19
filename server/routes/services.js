const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/services/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// @route   GET /api/services
// @desc    Get all services with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      rating,
      location,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - show both admin-created service types and approved provider services
    const query = {
      isActive: true,
      isApproved: true
    };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (rating) query['ratings.average'] = { $gte: parseFloat(rating) };
    if (location) query.serviceArea = { $regex: location, $options: 'i' };

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const services = await Service.find(query)
      .populate('provider', 'name email phone profilePicture ratings')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Service.countDocuments(query);

    res.json({
      services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/public
// @desc    Get all active services for public viewing
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for all active services
    const query = {
      isActive: true,
      isApproved: true
    };

    if (category) query.category = category;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const services = await Service.find(query)
      .populate('provider', 'name email phone')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Service.countDocuments(query);

    res.json({
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get public services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/available
// @desc    Get admin-created services available for providers to request
// @access  Private (Provider)
router.get('/available', protect, authorize('provider'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for admin-created services only (no provider assigned)
    const query = {
      isActive: true,
      isApproved: true,
      provider: null  // Only admin-created services
    };

    if (category) query.category = category;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const services = await Service.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const total = await Service.countDocuments(query);

    res.json({
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get available services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/provider/my
// @desc    Get current provider's services (both requested and approved)
// @access  Private (Provider)
router.get('/provider/my', protect, authorize('provider'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for provider's services
    const query = { provider: req.user._id };

    // Filter by status
    if (status === 'approved') {
      query.isApproved = true;
    } else if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const services = await Service.find(query)
      .populate('serviceReference', 'title')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const total = await Service.countDocuments(query);

    res.json({
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get provider services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/services/:serviceId/request
// @desc    Provider requests to provide an admin-created service
// @access  Private (Provider)
router.post('/:serviceId/request', protect, authorize('provider'), async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    console.log('🔔 Service request received:', { serviceId, userId: req.user._id });

    // Check if service exists and is admin-created
    const originalService = await Service.findById(serviceId);
    
    console.log('=== SERVICE REQUEST DEBUG ===');
    console.log('Service ID:', serviceId);
    console.log('User ID:', req.user._id);
    console.log('Service data:', {
      _id: originalService?._id,
      title: originalService?.title,
      provider: originalService?.provider,
      providerRequests: originalService?.providerRequests,
      createdBy: originalService?.createdBy
    });
    
    if (!originalService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Only allow requesting admin-created services (no provider assigned)
    if (originalService.provider) {
      console.log('Service has provider assigned:', originalService.provider);
      return res.status(400).json({ message: 'Can only request to provide admin-created services' });
    }

    // Check if provider already requested this service
    console.log('Checking existing requests for provider:', req.user._id);
    console.log('Provider requests array:', originalService.providerRequests);
    
    const existingRequest = originalService.providerRequests?.find(
      request => {
        const isSameProvider = request.provider.toString() === req.user._id.toString();
        const isNotApproved = !request.isApproved;
        const isNotRejected = !request.isRejected;
        
        console.log('Request check:', {
          requestId: request._id,
          providerId: request.provider.toString(),
          isSameProvider,
          isApproved: request.isApproved,
          isRejected: request.isRejected,
          isNotApproved,
          isNotRejected
        });
        
        return isSameProvider && isNotApproved && isNotRejected;
      }
    );

    if (existingRequest) {
      console.log('Found existing request:', existingRequest);
      return res.status(400).json({ message: 'You have already requested to provide this service' });
    }

    // Add provider request to the existing active admin service
    originalService.providerRequests = originalService.providerRequests || [];
    originalService.providerRequests.push({
      provider: req.user._id,
      isApproved: false,
      isRejected: false,
      requestedAt: new Date()
    });
    console.log('📝 Adding provider request:', {
      serviceId: originalService._id,
      providerId: req.user._id,
      totalRequests: originalService.providerRequests.length
    });
    
    await originalService.save();
    console.log('✅ Service saved successfully');

    // Update provider's services array with the original service
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      $push: { services: originalService._id }
    });
    console.log('✅ Provider services updated');

    res.status(201).json({
      message: 'Service request submitted successfully',
      service: originalService
    });
  } catch (error) {
    console.error('Request service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/:id
// @desc    Get single service by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'name email phone profilePicture')
      .populate('reviews.customer', 'name');

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/services
// @desc    Create a new service (admin only)
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), upload.array('images', 5), async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      provider: null, // Admin-created services have no provider initially
      images: req.files ? req.files.map(file => `/uploads/services/${file.filename}`) : [],
      isApproved: true, // Admin-created services are auto-approved
      isActive: true,
      createdBy: 'admin',
      providerRequests: [] // Initialize empty requests array
    };

    // Parse duration
    if (req.body.duration) {
      serviceData.duration = JSON.parse(req.body.duration);
    }

    // Parse availability
    if (req.body.availability) {
      serviceData.availability = JSON.parse(req.body.availability);
    }

    const service = new Service(serviceData);
    await service.save();

    const populatedService = await Service.findById(service._id)
      .populate('provider', 'name email phone profilePicture');

    res.status(201).json({
      message: 'Service created successfully',
      service: populatedService
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/services/:id
// @desc    Update a service
// @access  Private (Provider/Admin)
router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check authorization - provider can update their own services, admin can update any
    if (req.user.role === 'provider' && service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this service' });
    }

    const updateData = { ...req.body };

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/services/${file.filename}`);
      updateData.images = [...(service.images || []), ...newImages];
    }

    // Parse nested objects
    if (req.body.duration) {
      updateData.duration = JSON.parse(req.body.duration);
    }
    if (req.body.availability) {
      updateData.availability = JSON.parse(req.body.availability);
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('provider', 'name email phone profilePicture');

    res.json({
      message: 'Service updated successfully',
      service: updatedService
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete a service
// @access  Private (Provider/Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check authorization
    if (req.user.role === 'provider' && service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this service' });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/admin/requests
// @desc    Get all provider service requests for admin approval
// @access  Private (Admin)
router.get('/admin/requests', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for admin services with provider requests
    const query = {
      provider: null, // Admin-created services only
      'providerRequests.isApproved': false
    };

    if (category) query.category = category;

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Find admin services with pending provider requests
    const adminServices = await Service.find(query)
      .populate('providerRequests.provider', 'name email phone kycStatus')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Flatten provider requests into a single array for easier frontend processing
    const requests = [];
    adminServices.forEach(service => {
      if (service.providerRequests && service.providerRequests.length > 0) {
        service.providerRequests.forEach(request => {
          if (!request.isApproved && !request.isRejected) {
            requests.push({
              _id: service._id,
              title: service.title,
              description: service.description,
              category: service.category,
              subcategory: service.subcategory,
              price: service.price,
              priceType: service.priceType,
              duration: service.duration,
              serviceArea: service.serviceArea,
              images: service.images,
              provider: request.provider,
              createdAt: request.createdAt,
              isApproved: request.isApproved,
              isRejected: request.isRejected
            });
          }
        });
      }
    });

    // Sort requests by creation date
    requests.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Apply pagination to flattened requests
    const startIndex = skip;
    const endIndex = startIndex + limitNum;
    const paginatedRequests = requests.slice(startIndex, endIndex);

    res.json({
      requests: paginatedRequests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: requests.length,
        totalPages: Math.ceil(requests.length / limitNum)
      }
    });
  } catch (error) {
    console.error('Get service requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/services/admin/:serviceId/approve
// @desc    Approve a provider service request
// @access  Private (Admin)
router.post('/admin/:serviceId/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { providerId } = req.body;
    const serviceId = req.params.serviceId;

    const adminService = await Service.findById(serviceId);
    if (!adminService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Find the provider request in the admin service
    const providerRequest = adminService.providerRequests?.find(
      request => request.provider.toString() === providerId
    );

    if (!providerRequest) {
      return res.status(404).json({ message: 'Provider request not found' });
    }

    if (providerRequest.isApproved) {
      return res.status(400).json({ message: 'Provider request is already approved' });
    }

    // Update the existing admin service to assign the provider
    const updatedService = await Service.findByIdAndUpdate(serviceId, {
      provider: providerId,
      createdBy: 'provider',
      isActive: true,
      isApproved: true
    }, { new: true });

    // Update provider's services array with the assigned service
    await require('../models/User').findByIdAndUpdate(providerId, {
      $push: { services: serviceId }
    });

    // Update the provider request status
    await Service.findByIdAndUpdate(serviceId, {
      $set: {
        'providerRequests.$[elem].isApproved': true,
        'providerRequests.$[elem].reviewedAt': new Date(),
        'providerRequests.$[elem].approvedServiceId': serviceId,
        'providerRequests.$[elem].reviewedBy': req.user._id
      }
    }, {
      arrayFilters: [{ 'elem.provider': providerId }]
    });

    // Get Socket.IO instance to notify providers
    const io = req.app.get('io');
    if (io) {
      // Find all active providers to notify about new service availability
      const activeProviders = await require('../models/User').find({
        role: 'provider',
        isActive: true
      }).select('_id name email');
      
      console.log(`Notifying ${activeProviders.length} active providers about approved provider for service: ${adminService.title}`);
      
      // Send notification to all active providers
      activeProviders.forEach(provider => {
        io.to(`user_${provider._id}`).emit('provider_approved', {
          service: {
            _id: adminService._id,
            title: adminService.title,
            category: adminService.category,
            price: adminService.price,
            priceType: adminService.priceType,
            description: adminService.description,
            serviceArea: adminService.serviceArea,
            approvedProvider: providerId
          },
          message: `New provider approved for "${adminService.title}" service!`
        });
      });
    }

    const serviceWithRequests = await Service.findById(serviceId)
      .populate('providerRequests.provider', 'name email phone');

    res.json({
      message: 'Provider request approved successfully',
      service: serviceWithRequests
    });
  } catch (error) {
    console.error('Approve service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/services/admin/:serviceId/reject
// @desc    Reject a provider service request
// @access  Private (Admin)
router.post('/admin/:serviceId/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { providerId, rejectionReason } = req.body;
    const serviceId = req.params.serviceId;

    const adminService = await Service.findById(serviceId);
    if (!adminService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Find provider request in admin service
    const providerRequest = adminService.providerRequests?.find(
      request => request.provider.toString() === providerId
    );

    if (!providerRequest) {
      return res.status(404).json({ message: 'Provider request not found' });
    }

    if (providerRequest.isApproved) {
      return res.status(400).json({ message: 'Cannot reject an approved request' });
    }

    // Update provider request to rejected
    await Service.findByIdAndUpdate(serviceId, {
      $set: {
        'providerRequests.$[elem].isRejected': true,
        'providerRequests.$[elem].rejectionReason': rejectionReason || 'Service request rejected',
        'providerRequests.$[elem].reviewedAt': new Date(),
        'providerRequests.$[elem].reviewedBy': req.user._id
      }
    }, {
      arrayFilters: [{ 'elem.provider': providerId }]
    });

    // Remove service from provider's services array
    await require('../models/User').findByIdAndUpdate(providerId, {
      $pull: { services: serviceId }
    });

    const serviceWithRequests = await Service.findById(serviceId)
      .populate('providerRequests.provider', 'name email phone');

    res.json({
      message: 'Provider request rejected successfully',
      service: serviceWithRequests
    });
  } catch (error) {
    console.error('Reject service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/services/:serviceId/clear-requests
// @desc    Clear all provider requests for a service (debug only)
// @access  Private (Admin)
router.delete('/:serviceId/clear-requests', protect, authorize('admin'), async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    console.log('Clearing provider requests for service:', serviceId);
    console.log('Current requests:', service.providerRequests);

    service.providerRequests = [];
    await service.save();

    console.log('Provider requests cleared');

    res.json({
      message: 'Provider requests cleared successfully',
      serviceId: serviceId
    });
  } catch (error) {
    console.error('Clear requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/services/:serviceId/debug-request
// @desc    Debug service request without authentication
// @access  Public (debug only)
router.post('/:serviceId/debug-request', async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    const testUserId = '507f1f77bcf86cd799439011'; // Test user ID
    
    console.log('=== DEBUG SERVICE REQUEST ===');
    console.log('Service ID:', serviceId);
    console.log('Test User ID:', testUserId);

    // Check if service exists and is admin-created
    const originalService = await Service.findById(serviceId);
    
    console.log('Service data:', {
      _id: originalService?._id,
      title: originalService?.title,
      provider: originalService?.provider,
      providerRequests: originalService?.providerRequests,
      createdBy: originalService?.createdBy
    });
    
    if (!originalService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Only allow requesting admin-created services (no provider assigned)
    if (originalService.provider) {
      console.log('Service has provider assigned:', originalService.provider);
      return res.status(400).json({ message: 'Can only request to provide admin-created services' });
    }

    // Check if provider already requested this service
    console.log('Checking existing requests for provider:', testUserId);
    console.log('Provider requests array:', originalService.providerRequests);
    
    const existingRequest = originalService.providerRequests?.find(
      request => {
        const isSameProvider = request.provider.toString() === testUserId;
        const isNotApproved = !request.isApproved;
        const isNotRejected = !request.isRejected;
        
        console.log('Request check:', {
          requestId: request._id,
          providerId: request.provider.toString(),
          isSameProvider,
          isApproved: request.isApproved,
          isRejected: request.isRejected,
          isNotApproved,
          isNotRejected
        });
        
        return isSameProvider && isNotApproved && isNotRejected;
      }
    );

    if (existingRequest) {
      console.log('Found existing request:', existingRequest);
      return res.status(400).json({ message: 'You have already requested to provide this service' });
    }

    // Add provider request to the existing active admin service
    originalService.providerRequests = originalService.providerRequests || [];
    originalService.providerRequests.push({
      provider: testUserId,
      isApproved: false,
      isRejected: false,
      requestedAt: new Date()
    });
    
    await originalService.save();
    console.log('Debug request added successfully');

    res.json({
      message: 'Debug service request submitted successfully',
      service: originalService
    });
  } catch (error) {
    console.error('Debug request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/services/:serviceId/debug-clear
// @desc    Clear all provider requests without authentication (debug only)
// @access  Public (debug only)
router.delete('/:serviceId/debug-clear', async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    console.log('=== DEBUG CLEAR REQUESTS ===');
    console.log('Service ID:', serviceId);
    console.log('Current requests:', service.providerRequests);

    service.providerRequests = [];
    await service.save();

    console.log('Provider requests cleared successfully');

    res.json({
      message: 'Provider requests cleared successfully',
      serviceId: serviceId,
      requestsCleared: true
    });
  } catch (error) {
    console.error('Debug clear requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
